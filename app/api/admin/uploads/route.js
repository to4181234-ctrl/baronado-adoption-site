import { authorizeMutation, apiResponse, readJson, badRequest } from '../../../../lib/server/adminHttp';
import { signedImageUpload } from '../../../../lib/server/adminData';

export const runtime = 'nodejs';

export async function POST(request) {
  const blocked = authorizeMutation(request);
  if (blocked) return blocked;
  try {
    const info = await readJson(request, 1000);
    const result = await signedImageUpload(info);
    return apiResponse({ data: result });
  } catch (error) {
    return badRequest(error);
  }
}
