import { NextResponse, NextRequest } from 'next/server';
import OpenAI from "openai"

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
  

const functions = [{
    name: "fetch_recruitu_data",
    description: "retrieve contacts from RecruitU's database of contacts",
    parameters: {
        type: "object",
        properties: {
            name: {
                type: "string",
                description: "Name of a user. This does a partial match to the user’s full name, so you can specify just their first name, just their last name, or both",
            },
            current_company: {
                type: "string",
                description: "Name of the current company for a user",
            },
            sector: {
                type: "string",
                description: "The sector the user is in and matches for either CONSULTING or FINANCE"
            },
            previous_company: {
                type: "string",
                description : "The name of the previous company for a user"
            },
            title: {
                type: "string",
                description : "The title of the user (i.e., Associate, Vice President, etc.)"
            },
            role: {
                type: "string",
                description: "The role that the user has now or has had in the past."
            },
            school: {
                type: "string",
                description: "The school of the user"
            },
            undergraduate_year: {
                type: "number",
                description: "The graduation year for the user for their respective undergraduate degree"
            },
            city: {
                type: "string",
                description: "The city of the user"
            }
        }
    }
}]

export async function POST(request: NextRequest) {
    const openai = new OpenAI({apiKey: process.env.OPENAI_API_KEY})

    try {
        const { message, chatHistory } = await request.json();
        console.log("[Debug]:", chatHistory);
        const initialResponse = await openai.chat.completions.create({
            model: 'gpt-4o-mini',
            messages: [
            ...chatHistory,
              {
                role: 'system',
                content: `You are NetworkU, a RecruitU tool designed to help students with networking for careers in Investment Banking and Consulting. 
                Your responsibilities are:
                1. Finding networking contacts based on user-provided information.
                2. Assisting with cold email drafts for those contacts.
                3. Answering questions about the networking process.
                If a user asks for something outside these responsibilities, politely inform them you cannot assist.

                If the user is looking for a networking contact, evaluate if the input data contains at least one of the following pieces of information for the person they are looking for: name, current company, sector, previous company, title, role, undergraduate school attended, undergraduate graduation year, or city. 
                1. If at least one field is provided, return a JSON object with "validSearch": true. If none of these fields are present, return "validSearch": false.
                2. Next, assess whether the user's question falls within the following criteria: it asks a clarifying question to one of your responses or ask for advice on the recruting process. If so, include "validHelp": true in the JSON object 
                Otherwise, include "validHelp": false.
                3. Additionally, provide a "reasoning" key in the JSON object that explains the logic behind your evaluations for both validSearch and validHelp.
                Always return the result in a clear and well-formatted JSON structure.`,
              },
              { role: 'user', content: `user message: ${message} and chat history: ${chatHistory} `},
            ], 
            temperature: 0,
            response_format: {
              type: "json_object",
            },
          });
          const responseContent = initialResponse.choices[0].message.content;


        const jsonResponse = responseContent ? JSON.parse(responseContent) : ""; // Parse the JSON string
        console.log(jsonResponse);
        if (jsonResponse.validHelp){
            const encoder = new TextEncoder();
            const stream = new ReadableStream({
                async start(controller) {
                  try {
                    const interpretedResponse = await openai.chat.completions.create({
                        model: "gpt-4o-mini",
                        messages: [
                        ...chatHistory, 
                        { role: "user", 
                            content: 
                            `Please help the user with their request if it falls within your responsibilities.`, 
                        },
                        ],
                        temperature: 0,
                        stream: true,
                    });

                    for await (const part of interpretedResponse) {
                        if (part.choices && part.choices[0]?.delta?.content) {
                        const chunk = part.choices[0].delta.content;
                        controller.enqueue(encoder.encode(chunk));
                        // delay to simulate typing effect random from 50 to 100 ms
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
        if (!jsonResponse.validSearch){
            const encoder = new TextEncoder();
            const stream = new ReadableStream({
                async start(controller) {
                  try {
                    const interpretedResponse = await openai.chat.completions.create({
                        model: "gpt-4o-mini",
                        messages: [
                        ...chatHistory, 
                        { role: "user", 
                            content: 
                            `Please ask the user to ask you a question within your responsibilities.`, 
                        },
                        ],
                        temperature: 0,
                        stream: true,
                    });

                    for await (const part of interpretedResponse) {
                        if (part.choices && part.choices[0]?.delta?.content) {
                        const chunk = part.choices[0].delta.content;
                        controller.enqueue(encoder.encode(chunk));
                        // delay to simulate typing effect random from 50 to 100 ms
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
        const response = await openai.chat.completions.create({
            model: 'gpt-4o-mini', // Model supporting function calling
            messages: [
            ...chatHistory,
              {
                role: 'system',
                content: `Using the user's messages in the chat history, find the necessary information in their queries to find people they can speak to.`,
              },
              { role: 'user', content: `user message: ${message} and chat history: ${chatHistory} `},
            ],
            functions: functions,
            function_call: 'auto', // Let the model decide when to call a function
          });

          const functionCall = response.choices[0].message?.function_call;

          if (!functionCall) {
            return NextResponse.json({
              error: "No function call was generated. Unable to process the request.",
            });
          }
          const { arguments: functionArguments } = functionCall;
          const params = JSON.parse(functionArguments);
          console.log("[Debug]", JSON.stringify(params));
          const queryUrl = `https://dev-dot-recruit-u-f79a8.uc.r.appspot.com/api/lateral-recruiting?` + 
            Object.entries(params)
            .filter(([, value]) => value) // Ignore the key; filter based on the value
            .map(([key, value]) => `${key}=${encodeURIComponent(String(value))}`) // Encode values
            .join('&');

            const recruitUResponse = await fetch(queryUrl, {
                method: "GET",
              });
              // Check if the response is ok
              if (!recruitUResponse.ok) {
                throw new Error(`HTTP error! Status: ${recruitUResponse.status}`);
              }
          
            const data = await recruitUResponse.json();
            const cleanedData = data.results
            .slice(0, 5) // Limit to the first 5 entries
            .map((person : Person) => ({
                id: person.id,
                full_name: person.document.full_name,
                email: person.document.email,
                title: person.document.title,
                linkedin: person.document.linkedin,
                company_name: person.document.company_name,
                school: person.document.school,
            }));
            console.log("[Debug] Cleaned Data:", cleanedData);
            const encoder = new TextEncoder();
            const stream = new ReadableStream({
                async start(controller) {
                  try {
                    const interpretedResponse = await openai.chat.completions.create({
                        model: "gpt-4o-mini",
                        messages: [
                        ...chatHistory, 
                        { role: "system", 
                            content:
                            `Here is contact information from RecruitU's database:${JSON.stringify(cleanedData)}.
                            1. If the contact information is empty, please apologize to the user about not having a contact and ask if you can help in another way.
                            2. If it is not empty, interpret it in a concise manner in the context of the chat. 
                            3. Please also provide support according to what the user asked for in the chat.
                            Keep your response brief and ask the user if they need help reaching out.`, 
                        },
                        ],
                        temperature: 0,
                        stream: true,
                    });

                    for await (const part of interpretedResponse) {
                        if (part.choices && part.choices[0]?.delta?.content) {
                        const chunk = part.choices[0].delta.content;
                        controller.enqueue(encoder.encode(chunk));
                        // delay to simulate typing effect random from 50 to 100 ms
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
            } catch (error) {
                console.error("Error processing chat request:", error);
                return NextResponse.json(
                { error: "Internal server error" },
                { status: 500 },
                );
            }
}
    
