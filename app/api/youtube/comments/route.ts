import { NextRequest, NextResponse } from 'next/server'

export async function GET(req: NextRequest) {
  const videoId = req.nextUrl.searchParams.get('videoId')
  const pageToken = req.nextUrl.searchParams.get('pageToken') || ''
  const key = process.env.YOUTUBE_API_KEY!
  const url =
    `https://www.googleapis.com/youtube/v3/commentThreads` +
    `?part=snippet&videoId=${videoId}&maxResults=30&order=relevance` +
    `&pageToken=${pageToken}&key=${key}`
  const r = await fetch(url)
  const data = await r.json()
  const items = (data.items || []).map((i: any) => {
    const c = i.snippet.topLevelComment.snippet
    return {
      id: i.snippet.topLevelComment.id,
      author: c.authorDisplayName,
      text: c.textDisplay,
      likes: c.likeCount,
    }
  })
  return NextResponse.json({ items, nextPageToken: data.nextPageToken || null })
}
