declare module "axios/lib/adapters/xhr.js" {
  import type { AxiosAdapter } from "axios";
  const xhrAdapter: AxiosAdapter | false;
  export default xhrAdapter;
}
