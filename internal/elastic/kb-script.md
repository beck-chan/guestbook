I wanted to use Kibana to visualize the documentation that gets indexed, as well as explore some of the chatbot history data, so I wrapped Kibana into the Docker volume to test. 

***

Here we can see the the documentation is indexed as expected, and our chat history is captured as well.

***

I set up some data views to play around with the charting, and I can already sense how useful this would be at a larger scale, for example, how many people ask about x feature, or search for y product, and how accurate are the results we are returning to them are really, and so on.

***

Here I'm just playing around in the Dev Tools, curious to see how a search was ranked and what was returned. A lot of the time to an end-user, or at least to someone who isn't a seasoned ML professional like me, a RAG pipeline seems almost, inscrutable, what's the logic behind what gets shown, so it was neat get this transparent view into what was happening. 
