export interface WebFingerAcctResult {
  subject: string;
  links: (
    | { rel: string; href: string }
    | { rel: string; type: string; href: string }
    | { rel: string; template: string }
  )[];
}

export type FetchLike = (
  url: string | URL,
  init: RequestInit
) => PromiseLike<Response>;

export class WebFinger {
  constructor(private fetch: FetchLike) {}

  acct(host: string | URL, acct: `${string}@${string}`) {
    console.info(`👀 webfinger acct: ${acct}`);

    const url = new URL("./.well-known/webfinger", host);
    url.searchParams.set("resource", `acct:${acct}`);

    return this.fetch(url, {}).then(
      (res): Promise<WebFingerAcctResult> => res.json()
    );
  }
}
