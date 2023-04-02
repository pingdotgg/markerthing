# [MarkerThing](https://marker.ping.gg) (by [Ping](https://ping.gg))

tl;dr - grab csv files from your Twitch [Stream Markers](https://help.twitch.tv/s/article/creating-highlights-and-stream-markers?language=en_US#:~:text=in%20light%20purple.-,Stream%20Markers,-Stream%20Markers%20are) to use with [LosslessCut](https://github.com/mifi/lossless-cut)

## More Info

[Theo](https://twitter.com/t3dotgg) wanted a better way to manage the markers from his streams. He uses them as reference points to grab chunks of video for his editors. This app lets you see all the markers trivially as well as exporting them to a CSV file.

The CSV files exported are designed to be used with [LosslessCut](https://github.com/mifi/lossless-cut), a phenomenal open source video cutting tool. We also included a time offset option to set all the times forward or backward by a chosen number of seconds.

## My workflow:

- Stream on Twitch, record vod + footage on camera
- During stream, create new markers using `/marker (name of marker)` command
- End of stream, download CSVs from MarkerThing
  - I make a second offset CSV for my camera footage, since I start recording it after I start the stream
- Open LosslessCut, drag VOD in, drag CSV in, "export"
- ^ again, with camera recordings + offset CSV

This workflow takes me ~3 minutes, and it enables my team to quickly grab 5+ videos worth of content after every stream.
