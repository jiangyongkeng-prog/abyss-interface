# Native video API

Video generation remains separate from the chat model. Configure these
environment variables in the deployment environment:

```env
VIDEO_API_BASE=https://yunshuaiapi.com/v1
VIDEO_API_KEY=your_video_api_key
VIDEO_MODEL=grok-imagine-video
VIDEO_DURATION_OPTIONS=6,10,12,16,20
VIDEO_SECONDS=10
VIDEO_SIZE=1280x720
VIDEO_RESOLUTION_NAME=720p
VIDEO_PRESET=custom
```

The chat model remains the planner: it decides whether a user message should
call the video tool at all. The duration control only supplies the native
length after that decision. In chat, an explicit request such as `generate a
12 second video` also selects 12 seconds.

The server submits multipart form data to `/video/generations`, polls the
returned task until it finishes, then downloads the returned `result_url` for
playback in the console.
