type Res = {
  setHeader: (k: string, v: string) => void;
  status: (n: number) => Res;
  end: () => void;
  json: (body: object) => void;
};

export function setCors(res: Res) {
  res.setHeader('Access-Control-Allow-Origin', process.env.CORS_ORIGIN || '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, PATCH, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
}

export function handleOptions(res: Res) {
  setCors(res);
  res.status(204).end();
}
