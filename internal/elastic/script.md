I wanted to see how far I could get playing around with Elastic myself, so I integrated a chatbot proof-of-concept into some MDX documentation I built for the Next.js application I designed for fun, since building a RAG pipeline for user guidance content is what Elasticsearch is perfect for. 

I recorded this demo in advance because I wanted to control the delivery better and avoid any unexpected issues like hitting rate limits when I didn't intend to.

***
***

I've set up a demo Elasticsearch container served by Docker, which persists the index data for the documentation that gets synced in a volume. 

***

Now that Docker is running, I'm going to stand up the Elasticsearch container. I noticed it takes about 30 seconds for Elasticsearch to boot, so I've fast-forwarded here before confirming that we get the famous "you know, for search" message — and we do.

Next I'm going to quickly generate the API key that allows the frontend chatbot routing to communicate with the Elastic container, and plunk it into my .env file off-screen.

***

With the Elasticsearch container responsive, I'm going to use my script to sync MDX files from my GitHub repo where the source of truth for the documentation lives. This indexing is what loads those docs into Elasticsearch so the chatbot has something to search. 

***

Since my project's backend was already hosted on Supabase, I went ahead and created some tables for the chat integration: 

- `docs_chat_session` holds one conversation in the `docs_chat_id` session cookie. 
- `docs_chat_message` captures each turn in a conversation, the user's question or the chatbot's reply.
- And since I already had `rate-limiter-flexible` installed to limit commenting frequency in my application, I reused it with `docs_chat_limits` to store how many questions have been used and when that window expires. 

***

With the documentation indexed in the Elasticsearch container, I'm going to run just the documentation for the application. Obviously this is sped up a bit, but once you ask a question it searches the index, provides links to relevant guides, then summarizes the findings for you.

***

This next bit is from a new session, where I ask the chatbot a few more questions, have the session persist as I navigate to a different page of the documentation, and we can verify that the session appears on the `docs_chat_session` table, and each turn in our conversation gets captured in `docs_chat_message`.

Then once we click **Clear Chat**, the session is deleted from the `docs_chat_session` and the history gone from the chat window, starting a new session.

***

Finally, I'm going to deliberately hit the chat rate limit, which is currently set at 5 questions per hour, 10 max a day, captured in our `docs_chat_limits` table.








