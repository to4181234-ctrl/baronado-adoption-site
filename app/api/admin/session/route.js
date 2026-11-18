import { adminReady, adminAccess, adminPasswordlessPreview } from '../../../../lib/server/adminSession';
import { apiResponse } from '../../../../lib/server/adminHttp';
export const dynamic = 'force-dynamic';
export async function GET(request) {
 const access=await adminAccess(request);
 return apiResponse({configured:adminReady(),authenticated:access.authenticated,
  signedIn:access.signedIn,authMode:access.mode,passwordlessPreview:adminPasswordlessPreview(),noLoginRequired:access.mode==='shared_link'});
}
