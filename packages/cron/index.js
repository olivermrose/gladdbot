import process from "node:process";

const BASE_URL = "https://backboard.railway.com/graphql/v2";

async function railwayRequest(query) {
	const response = await fetch(BASE_URL, {
		method: "POST",
		headers: {
			"Content-Type": "application/json",
			Authorization: `Bearer ${process.env.RAILWAY_TOKEN}`,
		},
		body: JSON.stringify({ query }),
	});

	const { data } = await response.json();
	return data;
}

const response = await railwayRequest(`
	query {
		deployments(
			first: 1,
			input: {
				projectId: "${process.env.TARGET_PROJECT_ID}"
				environmentId: "${process.env.TARGET_ENVIRONMENT_ID}"
				serviceId: "${process.env.TARGET_SERVICE_ID}"
			}
		) {
			edges {
				node {
					id
				}
			}
		}
	}`);

const { id } = response.deployments.edges[0].node;

try {
	await railwayRequest(`mutation { deploymentRestart(id: "${id}") }`);
	console.log("Deployment restarted");
} catch {
	console.log("Failed to restart deployment");
}
