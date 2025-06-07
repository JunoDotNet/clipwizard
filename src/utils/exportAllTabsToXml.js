import exportToPremiereXml from './exportToPremiereXml';

export async function exportAllTabsAsXml(clipTabs, videoFilePath, resolution) {
  for (const tab of clipTabs) {
    if (!tab.clips?.length) continue;

    const xml = exportToPremiereXml(
      tab.clips,
      videoFilePath,
      tab.name || 'Unnamed_Cut',
      resolution
    );

    const blob = new Blob([xml], { type: 'application/xml' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `${tab.name || 'Cut'}.xml`;
    a.click();
  }
}
