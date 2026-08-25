import { getProviderKey } from "../../modelGateway";
import { modelProviders } from "../../modelProviders";

export async function GET() {
  return Response.json({
    providers: modelProviders.map((provider) => ({
      id: provider.id,
      configured: Boolean(getProviderKey(provider.id)),
    })),
  });
}

