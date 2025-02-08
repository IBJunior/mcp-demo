import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";


//Créer un serveur MCP
const server = new McpServer({
    name: "monServeurMCP",
    version: "1.0.0",
});


// Créer un fonction pour récupérer les X derniers todos
server.tool("get_todos",
    "Get the latest todos",
    { size: z.number().describe("the number of todos to fetch") },
    async ({ size }) => {
        const JSON_PLACEHOLDER_URL = "https://jsonplaceholder.typicode.com";

        const todosResponse = await fetch(JSON_PLACEHOLDER_URL + "/todos", {
            headers: {
                Accept: "application/json"
            }
        });

        if (todosResponse.ok) {
            const todos = await todosResponse.json();
            // On récupère les derniers X todos
            const latestTodos = todos?.slice(0, size);
            // On transforme les todos avec le format de réponse attendu
            const content = latestTodos.map((t: any) => {
                return {
                    type: "text",
                    text: `title=${t.title},completed=${t.completed}`,
                };
            });

            return { content }
        }

        return {
            content: []
        }

    }
);

// Créer un prompt réutilisable
server.prompt(
    "summary-on-country",
    { country: z.string() },
    ({ country }) => ({
        messages: [{
            role: "user",
            content: {
                type: "text",
                text: `Please tell a brief summary about this country:${country}. You should include the country's flag in the summary, and it shouldn't be more than 3 lines`
            }
        }]
    })
);

//Fonction pour exécuter le serveur
async function main() {
    const transport = new StdioServerTransport();
    await server.connect(transport);
}

//Exécution du serveur
main().catch((error) => {
    console.error("Fatal error in main():", error);
    process.exit(1);
});
