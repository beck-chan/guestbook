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

***
***






