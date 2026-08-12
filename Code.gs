/**
 * Background Remover for Google Slides.
 *
 * Menu -> sidebar -> pick an image on the slide -> remove its background
 * client-side (in the sidebar, via @imgly/background-removal) -> send the
 * transparent PNG back here to replace the image in place.
 */

function onOpen() {
  SlidesApp.getUi()
    .createMenu('Gslides Background Remover')
    .addItem('Remove Background', 'showSidebar')
    .addToUi();
}

function showSidebar() {
  const html = HtmlService.createHtmlOutputFromFile('Sidebar')
    .setTitle('Gslides Background Remover')
    .setWidth(320);
  SlidesApp.getUi().showSidebar(html);
}

/**
 * Returns the currently selected image (as a data URL) plus its object ID,
 * so the sidebar can later tell replaceImage() which element to update.
 */
function getSelectedImageInfo() {
  const selection = SlidesApp.getActivePresentation().getSelection();
  if (!selection) {
    throw new Error('Nothing is selected. Click an image on the slide, then try again.');
  }
  if (selection.getSelectionType() !== SlidesApp.SelectionType.PAGE_ELEMENT) {
    throw new Error('Select an image on the slide first.');
  }
  const range = selection.getPageElementRange();
  if (!range) {
    throw new Error('Select an image on the slide first.');
  }

  const imageElement = range.getPageElements().filter(function (el) {
    return el.getPageElementType() === SlidesApp.PageElementType.IMAGE;
  })[0];

  if (!imageElement) {
    throw new Error('The current selection is not an image. Select a photo and try again.');
  }

  const blob = imageElement.asImage().getBlob();
  const contentType = blob.getContentType() || 'image/png';
  const base64 = Utilities.base64Encode(blob.getBytes());

  return {
    objectId: imageElement.getObjectId(),
    dataUrl: 'data:' + contentType + ';base64,' + base64
  };
}

/**
 * Replaces the image identified by objectId with the processed
 * (background-removed) image. Image.replace() keeps the element's
 * position, size, rotation, object ID and z-order intact.
 */
function replaceImage(objectId, processedDataUrl) {
  const slides = SlidesApp.getActivePresentation().getSlides();

  for (let i = 0; i < slides.length; i++) {
    const elements = slides[i].getPageElements();
    for (let j = 0; j < elements.length; j++) {
      const el = elements[j];
      if (el.getObjectId() === objectId && el.getPageElementType() === SlidesApp.PageElementType.IMAGE) {
        const commaIndex = processedDataUrl.indexOf(',');
        const contentType = processedDataUrl.substring(5, processedDataUrl.indexOf(';')) || 'image/png';
        const bytes = Utilities.base64Decode(processedDataUrl.substring(commaIndex + 1));
        const blob = Utilities.newBlob(bytes, contentType, 'background-removed.png');

        el.asImage().replace(blob, false);
        return { success: true };
      }
    }
  }

  return {
    success: false,
    error: 'Could not find the original image (it may have moved or been deleted). Re-select it and try again.'
  };
}
