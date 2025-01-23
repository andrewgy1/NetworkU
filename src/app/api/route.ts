import { NextResponse, NextRequest } from 'next/server';
import OpenAI from "openai";
import yaml from "js-yaml";
import fs from "fs";
import path from "path";
import { Message } from '../page'; 

// Prompts for OpenAI API calls
interface Config {
    systemPrompt: string
    reprompt: string
    searchPrompt: string
    coldEmailQuestionPrompt: string
    clarifyingQuestionPrompt: string
    generalQuestionPrompt: string
}

// Functions for OpenAI function call
const functions = [{
    name: "fetch_recruitu_data",
    description: "Retrieve contacts from RecruitU's database of contacts for the user to either give them contacts to network with or give them more information about",
    parameters: {
        type: "object",
        properties: {
            name: {
                type: "string",
                description: "Name of the user's ideal contact. This does a partial match to the user’s full name, so you can specify just their first name, just their last name, or both",
            },
            current_company: {
                type: "string",
                description: "Name of the current company for the user's ideal contact",
            },
            sector: {
                type: "string",
                description: "The sector the user or the user's ideal contact is in and matches for either CONSULTING or FINANCE"
            },
            previous_company: {
                type: "string",
                description : "The name of the previous company for a user or the user's ideal contact"
            },
            title: {
                type: "string",
                description : "The title of the user's ideal contact (i.e., Associate, Vice President, etc.)"
            },
            role: {
                type: "string",
                description: "The role that the user or the user's ideal contact has now or has had in the past."
            },
            school: {
                type: "string",
                description: "The undergraduate university or college of the user or the user's ideal contact"
            },
            undergraduate_year: {
                type: "number",
                description: "The graduation year for the user's ideal contact for their respective undergraduate degree"
            },
            city: {
                type: "string",
                description: "The city of the user or the user's ideal contact"
            }
        }
    }
}]

// Formatting and Accessing RecruitU API call data
type Result = {
    id: string
    document: Document
}
  
interface Document {
    id: string
    last_name: string
    created_at: string
    source: string
    linkedin: string
    title: string
    alumni: boolean
    phone: string
    company_name: string
    grade: string
    club_id: string
    first_name: string
    email: string
    school: string
    full_name: string
    country: string
    city: string
    previous_companies: string 
    undergrad?: Undergrad
    current_company: CurrentCompany
    profile_pic_url: string
    previous_titles: string
}
  
interface Undergrad {
    starts_at?: Date
    school: string
    degree_name?: string
    activities_and_societies: string [] | string | null
    description: string | null
    ends_at?: Date
    field_of_study?: string
}
  
interface CurrentCompany {
    starts_at?: Date
    logo_url: string
    description?: string
    location?: string
    company: string
    ends_at?: Date
    title: string
}
  
interface Date {
    month: number
    year: number
    day: number
}

// Makes OpenAI function call, queries RecruitU API, and returns contact data
async function getContacts(chatHistory: Message[], openai: OpenAI){
    const response = await openai.chat.completions.create({
        model: 'gpt-4o',
        messages: [
        ...chatHistory,
        {
            role: 'system',
            content: `Find the information in the user's messages to find them networking contacts for the user.
            Always use one of the provided functions to respond to the user's message.`,
        },
        { role: 'user', content: `chat history: ${JSON.stringify(chatHistory)} `},
        ],
        functions: functions,
        function_call: 'auto',
    });
    const functionCall = response.choices[0].message?.function_call;
    if (!functionCall) {
        return NextResponse.json({
            error: "No function call was generated. Unable to process the request.",
        });
    }

    // Create URL to query RecruitU's API
    const functionCallArguments = functionCall.arguments;
    const params = JSON.parse(functionCallArguments);
    const queryUrl = `https://dev-dot-recruit-u-f79a8.uc.r.appspot.com/api/lateral-recruiting?` + 
        Object.entries(params)
        .filter(([, value]) => value) 
        .map(([key, value]) => `${key}=${encodeURIComponent(String(value))}`) 
        .join('&');

        // Call RecruitU's API
    const recruitUResponse = await fetch(queryUrl, {method: "GET"});
    if (!recruitUResponse.ok) {
        throw new Error(`HTTP error! Status: ${recruitUResponse.status}`);
    }

    // Formate API data for natural language interpretation
    const data = await recruitUResponse.json();
    const slicedData = data.results.slice(0, 3);
    const formattedData = JSON.stringify(slicedData.map((result : Result) => `
        Full name: ${result.document.full_name},
        City: ${result.document.city},
        Current Company: ${result.document.current_company?.company},
        Current title/role: ${result.document.title},
        Undergraduate university/college: ${result.document.school},
        Email: ${result.document.email},
        LinkedIn: ${result.document.linkedin},
        Previous Companies (may include undergraduate organizations): ${result.document.previous_companies},
        Previous Titles: ${result.document.previous_titles},
        Education: 
            Name: ${result.document.undergrad?.school},
            Graduation Year/Class Year: ${result.document.undergrad?.ends_at?.year},
            Major/Field of Study: ${result.document.undergrad?.field_of_study},
            Activities: ${result.document.undergrad?.activities_and_societies},
            Description (may include coursework or activities): ${result.document.undergrad?.description}`).join('| Next Contact: '));
    return formattedData;
}

// Generate and stream Natural Language Response
async function networkuResponse (chatHistory: Message[], prompt : string, openai: OpenAI){
    const encoder = new TextEncoder();
    const stream = new ReadableStream({
        async start(controller) {
            try {
                const interpretedResponse = await openai.chat.completions.create({
                    model: "gpt-4o-mini",
                    messages: [
                    ...chatHistory, 
                    { role: "user", 
                        content: prompt, 
                    },
                    ],
                    temperature: 0,
                    stream: true,
                });

                for await (const part of interpretedResponse) {
                    if (part.choices && part.choices[0]?.delta?.content) {
                    const chunk = part.choices[0].delta.content;
                    controller.enqueue(encoder.encode(chunk));
                    await new Promise((resolve) =>
                        setTimeout(resolve, Math.floor(Math.random() * 50) + 50),
                    );
                    }
                }
                controller.close();
                } catch (error) {
                console.error("Error during stream:", error);
                controller.error("Streaming error occurred");
                }
        },
    });
    return new Response(stream, {
        headers: {
            "Content-Type": "text/event-stream",
            "Cache-Control": "no-cache",
            Connection: "keep-alive",
        },
    });
}

export async function POST(request: NextRequest) {
    const openai = new OpenAI({apiKey: process.env.OPENAI_API_KEY})
    const configPath = path.resolve(process.cwd(), "configs/chat.yaml");
    const config: Config = yaml.load(fs.readFileSync(configPath, "utf8")) as Config;
    try {
        const { chatHistory } = await request.json();

        // Evaluate the user's message and classify it
        const classification = await openai.chat.completions.create({
            model: 'gpt-4o',
            messages: [
            ...chatHistory,
              {
                role: 'system',
                content: config.systemPrompt,
              },
            ], 
            temperature: 0,
            response_format: {
              type: "json_object",
            },
        });
        const classificationContent = classification.choices[0].message.content;
        const classificationResponse = classificationContent ? JSON.parse(classificationContent) : "";

        // Address non-valid messages
        if (!classificationResponse.isValid){
            return networkuResponse(chatHistory, config.reprompt, openai);
        }

        // Address clarifying questions
        if(classificationResponse.isClarifying){
            if(classificationResponse.isGeneral){
                return networkuResponse(chatHistory, config.clarifyingQuestionPrompt + config.generalQuestionPrompt, openai);
            } else if (classificationResponse.isColdEmail){
                return networkuResponse(chatHistory, config.clarifyingQuestionPrompt + config.coldEmailQuestionPrompt, openai);
            } else if (classificationResponse.isSearch){
                const prompt = 
                    `Contact Information: ${await getContacts(chatHistory, openai)} 
                    Instructions: ${config.clarifyingQuestionPrompt} 
                    ${config.searchPrompt}`;
                return networkuResponse(chatHistory, prompt, openai);
            } else {
                return networkuResponse(chatHistory, config.clarifyingQuestionPrompt, openai);
            }
        } else {
            // Address new questions
            if(classificationResponse.isGeneral){
                return networkuResponse(chatHistory, config.generalQuestionPrompt, openai);
            }
            if(classificationResponse.isColdEmail){
                const contacts = await getContacts(chatHistory, openai);
                const prompt = JSON.stringify(contacts) + config.coldEmailQuestionPrompt;
                return networkuResponse(chatHistory, prompt, openai);
            }
            if(classificationResponse.isSearch){
                const contacts = await getContacts(chatHistory, openai);
                const prompt = 
                    `Contact Information: ${contacts} 
                    ${config.searchPrompt}`;
                return networkuResponse(chatHistory, prompt, openai);
            }
            else return networkuResponse(chatHistory, "Appropriately help the user.", openai);
        }
        
    } catch (error) {
        console.error("Error processing chat request:", error);
        return NextResponse.json(
        { error: "Internal server error" },
        { status: 500 },
        );
    }
}
    
