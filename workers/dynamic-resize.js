export default {
  async fetch(request, env, ctx) {
    return new Response("Dynamic resizing worker currently disabled.", { status: 200 });
  }
}
