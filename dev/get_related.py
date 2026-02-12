import wikipediaapi

# Initialize Wikipedia with a clear User-Agent (Required by Wiki rules)
wiki = wikipediaapi.Wikipedia(
    user_agent="WikiTokPoC/1.0 (contact@example.com)",
    language='en',
    extract_format=wikipediaapi.ExtractFormat.WIKI
)

page = wiki.page("finance")

print(page.links)
# return {
#     "title": page.title,
#     "summary": page.summary[:500] + "...", # First 500 chars for the 'script'
#     "url": page.fullurl,
#     # Mock 'Related' by picking 3 random links from the page
#     "related": random.sample(list(page.links.keys()), 3) if page.links else []
# }