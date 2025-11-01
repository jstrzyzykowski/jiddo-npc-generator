declare module "npm:zod" {
  export * from "zod";
}

declare module "npm:zod-to-json-schema" {
  export * from "zod-to-json-schema";
}

type DenoServeHandler = (request: Request) => Response | Promise<Response>;

declare const Deno: {
  env: {
    get(name: string): string | undefined;
  };
  serve(handler: DenoServeHandler, options?: { port?: number; signal?: AbortSignal }): void;
};
