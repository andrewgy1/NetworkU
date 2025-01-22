import { NextResponse, NextRequest } from 'next/server';
import OpenAI from "openai";
import yaml from "js-yaml";
import fs from "fs";
import path from "path";
import { Message } from '../page'; 

interface Config {
    systemPrompt: string
    reprompt: string
    searchPrompt: string
    coldEmailQuestionPrompt: string
    clarifyingQuestionPrompt: string
    generalQuestionPrompt: string
}
interface Person{
    id: number,
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
    school_facebook_profile_url: string,
    starts_at?: Date,
    school: string,
    degree_name?: string,
    logo_url: string,
    grade: string | number,
    activities_and_societies: string,
    description: string,
    ends_at?: string | Date | number,
    school_linkedin_profile_url?: string,
    field_of_study?: string
  }
  
  interface CurrentCompany {
    starts_at?: Date
    company_facebook_profile_url: string
    logo_url: string
    company_linkedin_profile_url?: string
    description?: string
    location?: string
    company: string
    ends_at?: Date
    title: string
  }
  
  export interface Date {
    month: number
    year: number
    day: number
  }

// Functions for OpenAI function call
const functions = [{
    name: "fetch_recruitu_data",
    description: "retrieve contacts from RecruitU's database of contacts for the user based on their target contact",
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
                description: "The school of the user or the user's ideal contact"
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

// Makes OpenAI function call, queries RecruitU API, and returns contact data
async function getContacts(chatHistory: Message[], openai: OpenAI){
    console.log(JSON.stringify(chatHistory));
    const response = await openai.chat.completions.create({
        model: 'gpt-4o-mini',
        messages: [
        ...chatHistory,
        {
            role: 'system',
            content: `Find the information in the user's messages to find people they can speak to.`,
        },
        { role: 'user', content: `chat history: ${JSON.stringify(chatHistory)} `},
        ],
        functions: functions,
        // function_call: 'auto', // Let the model decide when to call a function
    });
    console.log("[Debug]: OpenAI Response", JSON.stringify(response, null, 2));
    const functionCall = response.choices[0].message?.function_call;
    console.log("[Debug]: functionCall", functionCall);
    if (!functionCall) {
        return NextResponse.json({
        error: "No function call was generated. Unable to process the request.",
        });
    }

    // Create URL to query RecruitU's API
    const { arguments: functionArguments } = functionCall;
    const params = JSON.parse(functionArguments);
    console.log("[Debug]", JSON.stringify(params));
    const queryUrl = `https://dev-dot-recruit-u-f79a8.uc.r.appspot.com/api/lateral-recruiting?` + 
        Object.entries(params)
        .filter(([, value]) => value) // Ignore the key; filter based on the value
        .map(([key, value]) => `${key}=${encodeURIComponent(String(value))}`) // Encode values
        .join('&');

        // Call RecruitU's API
        const recruitUResponse = await fetch(queryUrl, {
            method: "GET",
        });
        if (!recruitUResponse.ok) {
            throw new Error(`HTTP error! Status: ${recruitUResponse.status}`);
        }

    // Limit response
    const data = await recruitUResponse.json();
    const cleanedData = data.results
    .slice(0, 5) // Limit to the first 5 entries
        // .map((person : Person) => ({
        //     id: person.id,
        //     full_name: person.document.full_name,
        //     email: person.document.email,
        //     title: person.document.title,
        //     linkedin: person.document.linkedin,
        //     company_name: person.document.company_name,
        //     school: person.document.school,
        // }))
        ;
    console.log("[Debug]: cleaned data", cleanedData);
    return cleanedData;
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
        console.log("[Debug]:", JSON.stringify(chatHistory));
        // Evaluate the user's message and classify it
        const initialResponse = await openai.chat.completions.create({
            model: 'gpt-4o-mini',
            messages: [
            ...chatHistory,
              {
                role: 'system',
                content: config.systemPrompt,
              },
              { role: 'user', content: `chat history: ${JSON.stringify(chatHistory)} `},
            ], 
            temperature: 0,
            response_format: {
              type: "json_object",
            },
        });
        const responseContent = initialResponse.choices[0].message.content;

        const jsonResponse = responseContent ? JSON.parse(responseContent) : "";
        console.log(jsonResponse);

        // Address non-valid messages
        if (!jsonResponse.isValid){
            return networkuResponse(chatHistory, config.reprompt, openai);
        }
        // Address clarifying questions
        if(jsonResponse.isClarifying){
            if(jsonResponse.isGeneral){
                return networkuResponse(chatHistory, config.clarifyingQuestionPrompt + config.generalQuestionPrompt, openai);
            } else if (jsonResponse.isColdEmail){
                return networkuResponse(chatHistory, config.clarifyingQuestionPrompt + config.coldEmailQuestionPrompt, openai);
            } else if (jsonResponse.isSearch){
                return networkuResponse(chatHistory, config.clarifyingQuestionPrompt + config.searchPrompt, openai);
            } else return networkuResponse(chatHistory, config.clarifyingQuestionPrompt, openai);
        } else {
            // Address new questions
            if(jsonResponse.isGeneral){
                return networkuResponse(chatHistory, config.generalQuestionPrompt, openai);
            }
            if(jsonResponse.isColdEmail){
                const contacts = await getContacts(chatHistory, openai);
                const prompt = JSON.stringify(contacts) + config.coldEmailQuestionPrompt;
                return networkuResponse(chatHistory, prompt, openai);
            }
            if(jsonResponse.isSearch){
                const contacts = await getContacts(chatHistory, openai);
                console.log("[Debug]: contacts", contacts);
                const prompt = `Contact information: ${JSON.stringify(contacts)} ${config.searchPrompt}`;
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
    
