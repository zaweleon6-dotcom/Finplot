export const config = {
  runtime: "edge"
};

export default function handler() {
  return new Response(
    JSON.stringify({ ok: true, msg: "chat endpoint alive" }),
    { status: 200 }
  );
}
