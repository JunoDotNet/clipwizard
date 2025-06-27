import exportToPremiereXml from './exportToPremiereXml';

export async function exportAllTabsAsXml(clipTabs, videoFilePath, exportPath, resolution) {
  for (const tab of clipTabs) {
    if (!tab.clips?.length) continue;

    const xml = exportToPremiereXml(
      tab.clips,
      videoFilePath,
      tab.name || 'Unnamed_Cut',
      resolution
    );

    const safeName = tab.name?.replace(/\s+/g, '_') || 'Cut';
    const xmlPath = `${exportPath}/${safeName}.xml`;

    await window.electronAPI.saveXmlToPath(xmlPath, xml);
  }
}
