import { createEditorJsTools } from './EditorJs';

jest.mock('@editorjs/header', () => jest.fn());
jest.mock('@editorjs/list', () => jest.fn());
jest.mock('@editorjs/image', () => jest.fn());
jest.mock('@editorjs/attaches', () => jest.fn());

describe('createEditorJsTools', () => {
  const uploadImageFile = jest.fn(async () => ({
    objectStorageObject: { cdnUrl: 'https://cdn.test/image.png' },
    width: 640,
    height: 480,
  }));
  const uploadFile = jest.fn(async () => ({
    cdnUrl: 'https://cdn.test/file.pdf',
    contentLength: 1234,
    contentType: 'application/pdf',
  }));

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('merges host-declared Editor.js tools with Caliobase built-ins', () => {
    class KidCentralHeroTool {}

    const tools = createEditorJsTools({
      tools: {
        'kidcentral/hero': KidCentralHeroTool,
      },
      uploadImageFile,
      uploadFile,
    });

    expect(tools.header).toBeDefined();
    expect(tools.list).toBeDefined();
    expect(tools.image).toBeDefined();
    expect(tools.attaches).toBeDefined();
    expect(tools['kidcentral/hero']).toBe(KidCentralHeroTool);
  });

  it('lets host applications override a built-in tool intentionally', () => {
    class CustomImageTool {}

    const tools = createEditorJsTools({
      tools: { image: CustomImageTool },
      uploadImageFile,
      uploadFile,
    });

    expect(tools.image).toBe(CustomImageTool);
  });

  it('keeps Caliobase upload behavior on the default image and attaches tools', async () => {
    const tools = createEditorJsTools({ uploadImageFile, uploadFile });
    const imageTool = tools.image as any;
    const attachesTool = tools.attaches as any;

    await expect(
      imageTool.config.uploader.uploadByFile(new File(['image'], 'image.png'))
    ).resolves.toEqual({
      success: true,
      file: {
        url: 'https://cdn.test/image.png',
        width: 640,
        height: 480,
      },
    });
    await expect(
      attachesTool.config.uploader.uploadByFile(new File(['file'], 'file.pdf'))
    ).resolves.toEqual({
      success: true,
      file: {
        url: 'https://cdn.test/file.pdf',
        name: 'file.pdf',
        size: 1234,
        contentType: 'application/pdf',
      },
    });
  });
});
