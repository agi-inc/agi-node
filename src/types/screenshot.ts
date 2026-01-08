/**
 * Screenshot handling with image data and metadata
 */

/**
 * Browser screenshot with decoded image data and metadata
 *
 * @example
 * ```typescript
 * const screenshot = await session.screenshot();
 * await screenshot.save("page.png");
 * console.log(`Size: ${screenshot.width}x${screenshot.height}`);
 * console.log(`URL: ${screenshot.url}`);
 * ```
 */
export class Screenshot {
  constructor(
    public readonly data: Buffer,
    public readonly format: 'png' | 'jpg',
    public readonly timestamp: Date,
    public readonly width: number,
    public readonly height: number,
    public readonly url: string,
    public readonly title: string
  ) {}

  /**
   * Save screenshot to file
   *
   * @param path - File path to save to (e.g., "screenshot.png")
   *
   * @example
   * ```typescript
   * const screenshot = await session.screenshot();
   * await screenshot.save("amazon.png");
   * ```
   */
  async save(path: string): Promise<void> {
    const fs = await import('fs/promises');
    await fs.writeFile(path, this.data);
  }

  /**
   * Create Screenshot from base64 data URL
   *
   * @param base64Data - Base64-encoded data URL (e.g., "data:image/jpeg;base64,...")
   * @param url - Current page URL
   * @param title - Current page title
   * @param timestamp - Screenshot timestamp (defaults to now)
   * @returns Screenshot instance with decoded image data
   */
  static fromBase64(base64Data: string, url: string, title: string, timestamp?: Date): Screenshot {
    // Parse data URL format: "data:image/jpeg;base64,..."
    let header: string;
    let encoded: string;

    if (base64Data.includes(',')) {
      [header, encoded] = base64Data.split(',', 2);
    } else {
      // Assume it's just base64 without header
      encoded = base64Data;
      header = 'data:image/png;base64';
    }

    // Decode base64 to buffer
    const imageData = Buffer.from(encoded, 'base64');

    // Determine format from header
    const format =
      header.toLowerCase().includes('jpeg') || header.toLowerCase().includes('jpg') ? 'jpg' : 'png';

    // Extract image dimensions
    const { width, height } = Screenshot.getImageDimensions(imageData, format);

    return new Screenshot(imageData, format, timestamp || new Date(), width, height, url, title);
  }

  /**
   * Extract width and height from image data
   *
   * @param data - Raw image bytes
   * @param format - Image format (png, jpg)
   * @returns Tuple of (width, height)
   */
  private static getImageDimensions(
    data: Buffer,
    format: 'png' | 'jpg'
  ): { width: number; height: number } {
    try {
      if (format === 'png' && data.length >= 24) {
        // PNG: width/height at bytes 16-24
        const width = data.readUInt32BE(16);
        const height = data.readUInt32BE(20);
        return { width, height };
      } else if (format === 'jpg') {
        // JPEG: scan for SOF0 marker (0xFFC0)
        for (let i = 0; i < data.length - 9; i++) {
          if (data[i] === 0xff && data[i + 1] === 0xc0) {
            const height = data.readUInt16BE(i + 5);
            const width = data.readUInt16BE(i + 7);
            return { width, height };
          }
        }
      }
    } catch (error) {
      // Fallback if parsing fails
    }

    return { width: 0, height: 0 };
  }
}
