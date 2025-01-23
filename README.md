## Introduction
This is NetworkU, a RecruitU proof of concept tool developed by Andrew Yang. It is a AI-powered virtual assistant meant to assist RecruitU users with the networking process for investment banking and consulting jobs. It can perform tasks such as finding networking contacts from RecruitU's database, suggest ideas for cold networking emails, and answer general questions about the networking process.

## Product Overview
After a quick logo animation, the user is brought to a familiar ChatGPT-like setting. On the screen is a preloaded message from the system that introduces itself and its functionalities, which include inding networking contacts from RecruitU's database, suggest ideas for cold networking emails, and answer general questions about the networking process. The user can send messages to NetworkU and receive tailored help.

## User Interface
Using a Next.js frontend built with React and daisyUI (a component library for Tailwind CSS), NetworkU has a simple, intuitive, and ChatGPT-like user interface for the user to get easy networking support.

## User Message Analysis
Using REST API endpoints provided by Next.js, the frontend sends the user's messages to the backend. In the backend, OpenAI's Chat Completion API calls are made with tailored prompt engineering to interpret the intention of the user's messages in the context of the conversation. It will decide, if the user is looking for a specific contact, looking for more information about a given contact, asking a clarifying question on something NetworkU said, seeking assistance with writing a cold email, needing general support with the networking process, or if the user is saying something outside the NetworkU's intended use case.

## Searching for Networking Contacts
If the user is looking for networking contacts or more information about a provided contact, OpenAI's Chat Completion API and function calling functionality and RecruitU's API are used to determine if the user is looking for a contact or looking for more information on an already given contact in the context of the conversation, retrieve the right parameters from the conversation, query the RecruitU API for networking contact matches, reformat the data, and convert the data into a natural language message for the user. 

This search functionality can support search parameters name, current company, sector, previous company, title, role, undergraduate school attended, undergraduate graduation year, or city. It successfully answers questions like "I'm a Harvard student looking to speak to alumni at Goldman" and "What did Liz study at Harvard" (after Liz is provided as a networking contact by NetworkU).

## Writing cold email templates
If the user is wanting NetworkU to write it a cold email template for a contact it provided, OpenAI's Chat Completion API is called with a prompt based on the cold emailing guidelines on RecruitU's website to support the user's request. It can tailor the email to include whatever the users asks for.

## Answering General Networking Questions
If the user is confused about the Investment Banking and Consulting networking process and asks a question about it,  OpenAI's Chat Completion API is called with a prompt based on the networking resources on RecruitU's website to answer any questions the user may have. 

## Handling Nonsensical Questions
NetworkU operates under boundaries defined by its role. It will politely refuse the user's unreasonable request and remind the user of its intended functionality.

## Running the App
This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.
To learn more about Next.js, take a look at the following resources:

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
