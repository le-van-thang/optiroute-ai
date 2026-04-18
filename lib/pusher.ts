import PusherServer from "pusher";
import Pusher from "pusher-js";

// Server-side Pusher (for triggering events)
export const pusherServer = new PusherServer({
  appId: process.env.PUSHER_APP_ID!,
  key: process.env.NEXT_PUBLIC_PUSHER_KEY!,
  secret: process.env.PUSHER_SECRET!,
  cluster: process.env.NEXT_PUBLIC_PUSHER_CLUSTER!,
  useTLS: true,
});

/**
 * Client-side Pusher (for subscribing to events)
 * Note: Initialized only in browser environment to avoid SSR errors.
 */
export const pusherClient = typeof window !== "undefined" 
  ? new Pusher(process.env.NEXT_PUBLIC_PUSHER_KEY!, {
      cluster: process.env.NEXT_PUBLIC_PUSHER_CLUSTER!,
      authEndpoint: "/api/pusher/auth",
      authTransport: "ajax",
      auth: {
        headers: {
          "Content-Type": "application/json",
        },
      },
    })
  : null;
