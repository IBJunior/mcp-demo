import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";
import OpenAI from "openai";


const openai = new OpenAI();

const client = new Client(
    {
        name: "client-mcp",
        version: "1.0.0"
    },
    {
        capabilities: {
            prompts: {},
            resources: {},
            tools: {}
        }
    }
);

const transport = new StdioClientTransport({
    command: "node",
    args: ["build/server.js"]
});


await client.connect(transport);

// on récupère le nom du pays à résumer
const country = process.argv[2];

// Liste des prompts
const prompts = await client.listPrompts();
// Récupération du prompt pour pour résumer les informations sur un pays
const prompt = await client.getPrompt({
    name: "summary-on-country",
    arguments: { country }
})

const userPrompt = prompt.messages[0]?.content?.text;


const completionWithoutTool = await createCompletion([
    { role: "system", content: "You are a helpful assistant." },
    {
        role: "user",
        content: `${userPrompt}`
    },
]);

function createCompletion(messages: any, tools?: any) {
    return openai.chat.completions.create({
        model: "gpt-4o",
        messages,
        tools,
        store: true,
    });
}

console.log(`------------SUMMARY ABOUT ${country}------------`)
console.log(completionWithoutTool.choices[0].message.content);


const toolsList = await client.listTools();

const tools = toolsList.tools.map(tool => {
    return {
        "type": "function",
        "function": {
            "name": tool.name,
            "description": tool.description,
            "parameters": tool.inputSchema,
            "strict": true
        }
    }
});

const messages = [
    { role: "system", content: "You are a helpful assistant." },
    {
        role: "user",
        content: `What are my 4 latest todos`
    },
];

const completionWithTools = await createCompletion(messages, tools);

// On vérifie s'il y a une fonction à appeler
if (completionWithTools.choices[0].message.tool_calls) {

    // Récupérer des informations de la fonction (nom, arguments)
    const toolCall = completionWithTools.choices[0].message.tool_calls[0];
    const args = JSON.parse(toolCall.function.arguments);

    // On appelle la fonction
    const result = await client.callTool({
        name: toolCall.function.name,
        arguments: args
    });

    // On ajoute les messages de la fonction à la liste des messages
    //@ts-ignore
    messages.push(completionWithTools?.choices[0].message);
    messages.push({
        role: "tool",
        tool_call_id: toolCall.id,
        //@ts-ignore
        content: result.content
    });

    // On appelle le modèle pour générer la réponse
    const completion2 = await createCompletion(messages, tools);

    console.log();
    console.log();
    console.log("-------------YOUR TODOS-----------------");
    console.log(completion2.choices[0].message.content);

}






