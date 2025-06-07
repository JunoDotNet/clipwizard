export default function exportToPremiereXml(clips, videoFilePath, fileName = 'ClipWizard_Timeline', resolution = { width: 1920, height: 1080 }) {
  const { width, height } = resolution || { width: 1920, height: 1080 };
  const fps = 30;
  const pathurl = `file://localhost/${encodeURI(videoFilePath.replace(/\\/g, '/'))}`;
  const duration = Math.round(clips.reduce((acc, clip) => acc + (clip.end - clip.start), 0) * fps);
  const sequenceUuid = 'abf85ad2-8dd5-4897-b6bb-61505cba0497';
  const editingModeGuid = '9678af98-a7b7-4bdb-b477-7ac9c8df4a4e'; // Custom mode

  let videoTrack = '';
  let audioTrack1 = '';
  let audioTrack2 = '';
  let timelineStart = 0;

  clips.forEach((clip, index) => {
    const inFrame = Math.round(clip.start * fps);
    const outFrame = Math.round(clip.end * fps);
    const clipDuration = outFrame - inFrame;
    const start = timelineStart;
    const end = start + clipDuration;
    timelineStart = end;

    const pproTicksIn = inFrame * 8465666560;
    const pproTicksOut = outFrame * 8465666560;

    videoTrack += `
      <clipitem id="clipitem-${index + 1}">
        <masterclipid>masterclip-1</masterclipid>
        <name>${fileName}</name>
        <enabled>TRUE</enabled>
        <duration>${duration}</duration>
        <rate><timebase>${fps}</timebase><ntsc>TRUE</ntsc></rate>
        <start>${start}</start>
        <end>${end}</end>
        <in>${inFrame}</in>
        <out>${outFrame}</out>
        <pproTicksIn>${pproTicksIn}</pproTicksIn>
        <pproTicksOut>${pproTicksOut}</pproTicksOut>
        <file id="file-1">
          <name>${fileName}</name>
          <pathurl>${pathurl}</pathurl>
          <rate><timebase>${fps}</timebase><ntsc>TRUE</ntsc></rate>
          <duration>${duration}</duration>
          <media>
            <video>
              <samplecharacteristics>
                <rate><timebase>${fps}</timebase><ntsc>TRUE</ntsc></rate>
                <width>${width}</width>
                <height>${height}</height>
                <anamorphic>FALSE</anamorphic>
                <pixelaspectratio>square</pixelaspectratio>
                <fielddominance>none</fielddominance>
              </samplecharacteristics>
            </video>
            <audio>
              <samplecharacteristics>
                <depth>16</depth>
                <samplerate>48000</samplerate>
              </samplecharacteristics>
              <channelcount>2</channelcount>
            </audio>
          </media>
        </file>
        <link><linkclipref>clipitem-${index + 1}</linkclipref><mediatype>video</mediatype><trackindex>1</trackindex><clipindex>${index + 1}</clipindex></link>
        <link><linkclipref>clipitem-a${index + 1}</linkclipref><mediatype>audio</mediatype><trackindex>1</trackindex><clipindex>${index + 1}</clipindex><groupindex>1</groupindex></link>
        <link><linkclipref>clipitem-b${index + 1}</linkclipref><mediatype>audio</mediatype><trackindex>2</trackindex><clipindex>${index + 1}</clipindex><groupindex>1</groupindex></link>
      </clipitem>`;

    audioTrack1 += `
      <clipitem id="clipitem-a${index + 1}">
        <name>${fileName}</name>
        <enabled>TRUE</enabled>
        <duration>${duration}</duration>
        <rate><timebase>${fps}</timebase><ntsc>TRUE</ntsc></rate>
        <start>${start}</start>
        <end>${end}</end>
        <in>${inFrame}</in>
        <out>${outFrame}</out>
        <file id="file-1"/>
        <sourcetrack><mediatype>audio</mediatype><trackindex>1</trackindex></sourcetrack>
      </clipitem>`;

    audioTrack2 += `
      <clipitem id="clipitem-b${index + 1}">
        <name>${fileName}</name>
        <enabled>TRUE</enabled>
        <duration>${duration}</duration>
        <rate><timebase>${fps}</timebase><ntsc>TRUE</ntsc></rate>
        <start>${start}</start>
        <end>${end}</end>
        <in>${inFrame}</in>
        <out>${outFrame}</out>
        <file id="file-1"/>
        <sourcetrack><mediatype>audio</mediatype><trackindex>2</trackindex></sourcetrack>
      </clipitem>`;
  });

  return `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE xmeml>
<xmeml version="4">
  <sequence id="sequence-1"
    MZ.Sequence.PreviewFrameSizeWidth="${width}"
    MZ.Sequence.PreviewFrameSizeHeight="${height}"
    MZ.Sequence.EditingModeGUID="${editingModeGuid}"
  >
    <uuid>${sequenceUuid}</uuid>
    <name>${fileName}</name>
    <duration>${duration}</duration>
    <rate><timebase>${fps}</timebase><ntsc>TRUE</ntsc></rate>
    <media>
      <video>
        <format>
          <samplecharacteristics>
            <rate><timebase>${fps}</timebase><ntsc>TRUE</ntsc></rate>
            <width>${width}</width>
            <height>${height}</height>
            <anamorphic>FALSE</anamorphic>
            <pixelaspectratio>square</pixelaspectratio>
            <fielddominance>none</fielddominance>
          </samplecharacteristics>
        </format>
        <track>${videoTrack}</track>
      </video>
      <audio>
        <track>${audioTrack1}</track>
        <track>${audioTrack2}</track>
      </audio>
    </media>
    <timecode>
      <rate><timebase>${fps}</timebase><ntsc>TRUE</ntsc></rate>
      <string>00;00;00;00</string>
      <frame>0</frame>
      <displayformat>DF</displayformat>
    </timecode>
  </sequence>
</xmeml>`;
}
