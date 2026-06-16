import sys
import json
import os
from googleapiclient.discovery import build

# Load API key from .env
YOUTUBE_API_KEY = os.getenv("YOUTUBE_API_KEY")


def run(prompt: str, attitude: str = "Normal", max_videos: int = 5, max_comments: int = 10):
    text_data = []

    try:
        youtube = build("youtube", "v3", developerKey=YOUTUBE_API_KEY)

        # ── 1. Search for videos related to the prompt ──────────────────────
        search_response = youtube.search().list(
            q=prompt,
            part="id,snippet",
            maxResults=max_videos,
            type="video",
            relevanceLanguage="en",
            order="relevance"
        ).execute()

        video_ids = []
        for item in search_response.get("items", []):
            video_id = item["id"]["videoId"]
            snippet = item["snippet"]

            video_ids.append(video_id)

            text_data.append({
                "type": "video",
                "video_id": video_id,
                "title": snippet.get("title", ""),
                "description": snippet.get("description", ""),
                "channel": snippet.get("channelTitle", ""),
                "published_at": snippet.get("publishedAt", ""),
                "url": f"https://www.youtube.com/watch?v={video_id}"
            })

        # ── 2. Fetch full descriptions via videos.list ───────────────────────
        if video_ids:
            videos_response = youtube.videos().list(
                part="snippet,statistics",
                id=",".join(video_ids)
            ).execute()

            # Update entries with full description + stats
            stats_map = {}
            for v in videos_response.get("items", []):
                vid = v["id"]
                stats_map[vid] = {
                    "full_description": v["snippet"].get("description", ""),
                    "view_count": v["statistics"].get("viewCount", "0"),
                    "like_count": v["statistics"].get("likeCount", "0"),
                    "comment_count": v["statistics"].get("commentCount", "0"),
                }

            for entry in text_data:
                if entry.get("type") == "video":
                    vid = entry["video_id"]
                    if vid in stats_map:
                        entry.update(stats_map[vid])

        # ── 3. Fetch top comments for each video ─────────────────────────────
        for video_id in video_ids:
            try:
                comments_response = youtube.commentThreads().list(
                    part="snippet",
                    videoId=video_id,
                    maxResults=max_comments,
                    order="relevance",
                    textFormat="plainText"
                ).execute()

                for item in comments_response.get("items", []):
                    top = item["snippet"]["topLevelComment"]["snippet"]
                    text_data.append({
                        "type": "comment",
                        "video_id": video_id,
                        "author": top.get("authorDisplayName", ""),
                        "text": top.get("textDisplay", ""),
                        "like_count": top.get("likeCount", 0),
                        "published_at": top.get("publishedAt", "")
                    })
            except Exception:
                # Comments may be disabled on some videos — skip gracefully
                pass

    except Exception as e:
        text_data = [{"text": f"YouTube scrape error: {str(e)}"}]

    result = {
        "source": "youtube",
        "input": prompt,
        "attitude": attitude,
        "array": text_data
    }
    print(json.dumps(result))


if __name__ == "__main__":
    prompt   = sys.argv[1] if len(sys.argv) > 1 else "AI news"
    attitude = sys.argv[2] if len(sys.argv) > 2 else "Normal"
    run(prompt, attitude)
