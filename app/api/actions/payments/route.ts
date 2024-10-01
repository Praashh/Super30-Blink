import {
  ActionPostRequest,
  ActionPostResponse,
  ACTIONS_CORS_HEADERS,
  createPostResponse,
  PostNextActionLink,
} from "@solana/actions";

import { DEFAULT_SOL_ADDRESS } from "./config";
import {
  clusterApiUrl,
  Connection,
  LAMPORTS_PER_SOL,
  PublicKey,
  SystemProgram,
  Transaction,
} from "@solana/web3.js";
import { NextResponse } from "next/server";

const connection = new Connection(
  process.env.RPC_URL || clusterApiUrl("devnet")
);

export const GET = async (req: Request) => {
  try {
    const requestUrl = new URL(req.url);
    const { toPubkey } = validatedQueryParams(requestUrl);
    const basehref = new URL(
      `/api/actions/payments?to=${toPubkey.toBase58()}`,
      requestUrl.origin
    ).toString();

    const payload = {
      title: "100xdevs Super30",
      icon: new URL("/logo.png", requestUrl.origin).toString(),
      description: 
      "Starts 10th October\n" +
      "You can join online, but preferably come on-site.\n" +
      "Basic web development is a pre-requisite. Basics of React/Node.js should be known before joining.\n" +
      "3 months, intense on-site, build a lot of projects and productionising them.\n"+
      "On-site location - Sector 62 noida, 300m from the metro station. PG available 1km from the campus for Rs 10k/mo with food.\n\n"+
      "✨ Important: After making the payment, please send an email to 100xdevs@gmail.com with your transaction signature. We will use that email to grant you access to the course. 📧",
      links: {
        actions: [
          {
            label: "7.6SOL(1181.80$)",
            href: `${basehref}&amount=7.6`,
          },
        ],
      },
    };

    return new NextResponse(JSON.stringify(payload), {
      headers: ACTIONS_CORS_HEADERS,
    });
  } catch (err) {
    console.log(err);
    let message = "An unknown error occurred";
    if (typeof err == "string") message = err;
    return new Response(message, {
      status: 400,
      headers: ACTIONS_CORS_HEADERS,
    });
  }
};
export const OPTIONS = GET;

export const POST = async (req: Request) => {
  try {
    const requestUrl = new URL(req.url);
    const body: ActionPostRequest = await req.json();
    const { toPubkey } = validatedQueryParams(requestUrl);
    console.log("toPubkey", toPubkey);
    
    const amountParam = requestUrl.searchParams.get("amount");
    console.log("amountParam", amountParam);
    
    if (!amountParam) {
      throw new Error("Missing 'amount' parameter");
    }
    const amount = parseFloat(amountParam);
    console.log("amount", toPubkey);
    
    if (isNaN(amount) || amount <= 0) {
      throw new Error("Invalid 'amount' parameter");
    }
    let account: PublicKey;
    try {
      account = new PublicKey(body.account);
      console.log(account);
      
    } catch (err) {
      return new Response('Invalid "account" provided', {
        status: 400,
        headers: ACTIONS_CORS_HEADERS,
      });
    }

    const transferSolInstruction = SystemProgram.transfer({
      fromPubkey: account,
      toPubkey: toPubkey,
      lamports: amount * LAMPORTS_PER_SOL,
    });
    console.log("transferSolInstruction",transferSolInstruction);
    
    const { blockhash, lastValidBlockHeight } =  await connection.getLatestBlockhash();

    const transaction = new Transaction({
      feePayer: account,
      blockhash,
      lastValidBlockHeight,
    }).add(transferSolInstruction);

    const payload: ActionPostResponse = await createPostResponse({
      // @ts-ignore
      fields: {
        transaction,
        message:
          "please send an email to 100xdevs@gmail.com with the transaction signature. We’ll let you in the course with that email.",
      },
    });

    return new NextResponse(JSON.stringify(payload), {
      headers: ACTIONS_CORS_HEADERS,
    });
  } catch (err) {
    console.log(err);
    let message = "An unknown error occurred";
    if (typeof err == "string") message = err;
    return new Response(message, {
      status: 400,
      headers: ACTIONS_CORS_HEADERS,
    });
  }
};

function validatedQueryParams(requestUrl: URL) {
  let toPubkey: PublicKey = DEFAULT_SOL_ADDRESS;

  try {
    if (requestUrl.searchParams.get("to")) {
      toPubkey = new PublicKey(requestUrl.searchParams.get("to")!);
    }
  } catch (err) {
    throw "Invalid input query parameter: to";
  }

  return {
    toPubkey,
  };
}
