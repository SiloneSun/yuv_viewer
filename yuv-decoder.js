class YUVDecoder {
    constructor() {
        this.lookupTable = this.buildYUVLookupTable();
    }

    buildYUVLookupTable() {
        const table = new Array(256 * 256 * 3);
        for (let y = 0; y < 256; y++) {
            for (let u = 0; u < 256; u++) {
                for (let v = 0; v < 256; v++) {
                    const idx = (y << 16) | (u << 8) | v;
                    const yVal = 1.164 * (y - 16);
                    const uVal = u - 128;
                    const vVal = v - 128;
                    
                    let r = yVal + 1.596 * vVal;
                    let g = yVal - 0.392 * uVal - 0.813 * vVal;
                    let b = yVal + 2.017 * uVal;
                    
                    r = Math.max(0, Math.min(255, Math.round(r)));
                    g = Math.max(0, Math.min(255, Math.round(g)));
                    b = Math.max(0, Math.min(255, Math.round(b)));
                    
                    table[idx] = (r << 16) | (g << 8) | b;
                }
            }
        }
        return table;
    }

    yuvToRGB(y, u, v) {
        const idx = (y << 16) | (u << 8) | v;
        const val = this.lookupTable[idx];
        return {
            r: (val >> 16) & 0xff,
            g: (val >> 8) & 0xff,
            b: val & 0xff
        };
    }

    getFrameSize(width, height, format, bitDepth = 8) {
        const multiplier = bitDepth > 8 ? 2 : 1;
        switch(format) {
            case 'I420':
            case 'YV12':
            case 'NV12':
            case 'NV21':
                return Math.floor(width * height * 1.5) * multiplier;
            case 'I422':
            case 'YV16':
            case 'UYVY':
            case 'YUY2':
            case 'RGB565':
                return width * height * 2 * multiplier;
            case 'I444':
            case 'RGB888':
            case 'BGR888':
            case 'RGB':
                return width * height * 3 * multiplier;
            case 'ARGB8888':
            case 'ABGR8888':
                return width * height * 4;
            default:
                return Math.floor(width * height * 1.5) * multiplier;
        }
    }

    decode(buffer, width, height, format, bitDepth = 8) {
        const frameSize = this.getFrameSize(width, height, format, bitDepth);
        if (buffer.length < frameSize) {
            throw new Error(`缓冲区长度不足, 需要 ${frameSize} 字节, 实际 ${buffer.length} 字节`);
        }

        const imageData = new Uint8ClampedArray(width * height * 4);
        
        switch(format) {
            case 'I420': this.decodeI420(buffer, width, height, imageData); break;
            case 'YV12': this.decodeYV12(buffer, width, height, imageData); break;
            case 'NV12': this.decodeNV12(buffer, width, height, imageData); break;
            case 'NV21': this.decodeNV21(buffer, width, height, imageData); break;
            case 'I422': this.decodeI422(buffer, width, height, imageData); break;
            case 'YV16': this.decodeYV16(buffer, width, height, imageData); break;
            case 'UYVY': this.decodeUYVY(buffer, width, height, imageData); break;
            case 'YUY2': this.decodeYUY2(buffer, width, height, imageData); break;
            case 'I444': this.decodeI444(buffer, width, height, imageData); break;
            case 'RGB':
            case 'RGB888': this.decodeRGB(buffer, width, height, imageData); break;
            case 'BGR888': this.decodeBGR888(buffer, width, height, imageData); break;
            case 'RGB565': this.decodeRGB565(buffer, width, height, imageData); break;
            case 'ARGB8888': this.decodeARGB8888(buffer, width, height, imageData); break;
            case 'ABGR8888': this.decodeABGR8888(buffer, width, height, imageData); break;
            default: this.decodeI420(buffer, width, height, imageData);
        }

        return imageData;
    }

    decodeI420(buffer, width, height, imageData) {
        const ySize = width * height;
        const uvSize = ySize / 4;
        
        for (let y = 0; y < height; y++) {
            for (let x = 0; x < width; x++) {
                const yIdx = y * width + x;
                const uvY = Math.floor(y / 2);
                const uvX = Math.floor(x / 2);
                const uvIdx = uvY * Math.floor(width / 2) + uvX;
                
                const yVal = buffer[yIdx];
                const uVal = buffer[ySize + uvIdx];
                const vVal = buffer[ySize + uvSize + uvIdx];
                
                const rgb = this.yuvToRGB(yVal, uVal, vVal);
                const outIdx = yIdx * 4;
                
                imageData[outIdx] = rgb.r;
                imageData[outIdx + 1] = rgb.g;
                imageData[outIdx + 2] = rgb.b;
                imageData[outIdx + 3] = 255;
            }
        }
    }

    decodeYV12(buffer, width, height, imageData) {
        const ySize = width * height;
        const uvSize = ySize / 4;
        
        for (let y = 0; y < height; y++) {
            for (let x = 0; x < width; x++) {
                const yIdx = y * width + x;
                const uvY = Math.floor(y / 2);
                const uvX = Math.floor(x / 2);
                const uvIdx = uvY * Math.floor(width / 2) + uvX;
                
                const yVal = buffer[yIdx];
                const vVal = buffer[ySize + uvIdx];
                const uVal = buffer[ySize + uvSize + uvIdx];
                
                const rgb = this.yuvToRGB(yVal, uVal, vVal);
                const outIdx = yIdx * 4;
                
                imageData[outIdx] = rgb.r;
                imageData[outIdx + 1] = rgb.g;
                imageData[outIdx + 2] = rgb.b;
                imageData[outIdx + 3] = 255;
            }
        }
    }

    decodeNV12(buffer, width, height, imageData) {
        const ySize = width * height;
        
        for (let y = 0; y < height; y++) {
            for (let x = 0; x < width; x++) {
                const yIdx = y * width + x;
                const uvY = Math.floor(y / 2);
                const uvX = Math.floor(x / 2);
                const uvIdx = ySize + uvY * width + uvX * 2;
                
                const yVal = buffer[yIdx];
                const uVal = buffer[uvIdx];
                const vVal = buffer[uvIdx + 1];
                
                const rgb = this.yuvToRGB(yVal, uVal, vVal);
                const outIdx = yIdx * 4;
                
                imageData[outIdx] = rgb.r;
                imageData[outIdx + 1] = rgb.g;
                imageData[outIdx + 2] = rgb.b;
                imageData[outIdx + 3] = 255;
            }
        }
    }

    decodeNV21(buffer, width, height, imageData) {
        const ySize = width * height;
        
        for (let y = 0; y < height; y++) {
            for (let x = 0; x < width; x++) {
                const yIdx = y * width + x;
                const uvY = Math.floor(y / 2);
                const uvX = Math.floor(x / 2);
                const uvIdx = ySize + uvY * width + uvX * 2;
                
                const yVal = buffer[yIdx];
                const vVal = buffer[uvIdx];
                const uVal = buffer[uvIdx + 1];
                
                const rgb = this.yuvToRGB(yVal, uVal, vVal);
                const outIdx = yIdx * 4;
                
                imageData[outIdx] = rgb.r;
                imageData[outIdx + 1] = rgb.g;
                imageData[outIdx + 2] = rgb.b;
                imageData[outIdx + 3] = 255;
            }
        }
    }

    decodeI422(buffer, width, height, imageData) {
        const ySize = width * height;
        const uvSize = ySize / 2;
        
        for (let y = 0; y < height; y++) {
            for (let x = 0; x < width; x++) {
                const yIdx = y * width + x;
                const uvX = Math.floor(x / 2);
                const uvIdx = y * Math.floor(width / 2) + uvX;
                
                const yVal = buffer[yIdx];
                const uVal = buffer[ySize + uvIdx];
                const vVal = buffer[ySize + uvSize + uvIdx];
                
                const rgb = this.yuvToRGB(yVal, uVal, vVal);
                const outIdx = yIdx * 4;
                
                imageData[outIdx] = rgb.r;
                imageData[outIdx + 1] = rgb.g;
                imageData[outIdx + 2] = rgb.b;
                imageData[outIdx + 3] = 255;
            }
        }
    }

    decodeYV16(buffer, width, height, imageData) {
        const ySize = width * height;
        const uvSize = ySize / 2;
        
        for (let y = 0; y < height; y++) {
            for (let x = 0; x < width; x++) {
                const yIdx = y * width + x;
                const uvX = Math.floor(x / 2);
                const uvIdx = y * Math.floor(width / 2) + uvX;
                
                const yVal = buffer[yIdx];
                const vVal = buffer[ySize + uvIdx];
                const uVal = buffer[ySize + uvSize + uvIdx];
                
                const rgb = this.yuvToRGB(yVal, uVal, vVal);
                const outIdx = yIdx * 4;
                
                imageData[outIdx] = rgb.r;
                imageData[outIdx + 1] = rgb.g;
                imageData[outIdx + 2] = rgb.b;
                imageData[outIdx + 3] = 255;
            }
        }
    }

    decodeUYVY(buffer, width, height, imageData) {
        for (let y = 0; y < height; y++) {
            for (let x = 0; x < width; x += 2) {
                const idx = y * width * 2 + x * 2;
                
                const u = buffer[idx];
                const y1 = buffer[idx + 1];
                const v = buffer[idx + 2];
                const y2 = buffer[idx + 3];
                
                const rgb1 = this.yuvToRGB(y1, u, v);
                const outIdx1 = (y * width + x) * 4;
                imageData[outIdx1] = rgb1.r;
                imageData[outIdx1 + 1] = rgb1.g;
                imageData[outIdx1 + 2] = rgb1.b;
                imageData[outIdx1 + 3] = 255;
                
                const rgb2 = this.yuvToRGB(y2, u, v);
                const outIdx2 = (y * width + x + 1) * 4;
                imageData[outIdx2] = rgb2.r;
                imageData[outIdx2 + 1] = rgb2.g;
                imageData[outIdx2 + 2] = rgb2.b;
                imageData[outIdx2 + 3] = 255;
            }
        }
    }

    decodeYUY2(buffer, width, height, imageData) {
        for (let y = 0; y < height; y++) {
            for (let x = 0; x < width; x += 2) {
                const idx = y * width * 2 + x * 2;
                
                const y1 = buffer[idx];
                const u = buffer[idx + 1];
                const y2 = buffer[idx + 2];
                const v = buffer[idx + 3];
                
                const rgb1 = this.yuvToRGB(y1, u, v);
                const outIdx1 = (y * width + x) * 4;
                imageData[outIdx1] = rgb1.r;
                imageData[outIdx1 + 1] = rgb1.g;
                imageData[outIdx1 + 2] = rgb1.b;
                imageData[outIdx1 + 3] = 255;
                
                const rgb2 = this.yuvToRGB(y2, u, v);
                const outIdx2 = (y * width + x + 1) * 4;
                imageData[outIdx2] = rgb2.r;
                imageData[outIdx2 + 1] = rgb2.g;
                imageData[outIdx2 + 2] = rgb2.b;
                imageData[outIdx2 + 3] = 255;
            }
        }
    }

    decodeI444(buffer, width, height, imageData) {
        const ySize = width * height;
        const uvSize = ySize;
        
        for (let i = 0; i < ySize; i++) {
            const yVal = buffer[i];
            const uVal = buffer[ySize + i];
            const vVal = buffer[ySize + uvSize + i];
            
            const rgb = this.yuvToRGB(yVal, uVal, vVal);
            const outIdx = i * 4;
            
            imageData[outIdx] = rgb.r;
            imageData[outIdx + 1] = rgb.g;
            imageData[outIdx + 2] = rgb.b;
            imageData[outIdx + 3] = 255;
        }
    }

    decodeRGB(buffer, width, height, imageData) {
        for (let i = 0; i < width * height; i++) {
            const inIdx = i * 3;
            const outIdx = i * 4;
            
            imageData[outIdx] = buffer[inIdx];
            imageData[outIdx + 1] = buffer[inIdx + 1];
            imageData[outIdx + 2] = buffer[inIdx + 2];
            imageData[outIdx + 3] = 255;
        }
    }

    decodeBGR888(buffer, width, height, imageData) {
        for (let i = 0; i < width * height; i++) {
            const inIdx = i * 3;
            const outIdx = i * 4;
            
            imageData[outIdx] = buffer[inIdx + 2];
            imageData[outIdx + 1] = buffer[inIdx + 1];
            imageData[outIdx + 2] = buffer[inIdx];
            imageData[outIdx + 3] = 255;
        }
    }

    decodeRGB565(buffer, width, height, imageData) {
        for (let i = 0; i < width * height; i++) {
            const inIdx = i * 2;
            const outIdx = i * 4;
            
            const value = (buffer[inIdx + 1] << 8) | buffer[inIdx];
            let r = (value >> 11) & 0x1F;
            let g = (value >> 5) & 0x3F;
            let b = value & 0x1F;
            
            r = (r << 3) | (r >> 2);
            g = (g << 2) | (g >> 4);
            b = (b << 3) | (b >> 2);
            
            imageData[outIdx] = r;
            imageData[outIdx + 1] = g;
            imageData[outIdx + 2] = b;
            imageData[outIdx + 3] = 255;
        }
    }

    decodeARGB8888(buffer, width, height, imageData) {
        for (let i = 0; i < width * height; i++) {
            const inIdx = i * 4;
            const outIdx = i * 4;
            
            imageData[outIdx] = buffer[inIdx + 1];
            imageData[outIdx + 1] = buffer[inIdx + 2];
            imageData[outIdx + 2] = buffer[inIdx + 3];
            imageData[outIdx + 3] = buffer[inIdx];
        }
    }

    decodeABGR8888(buffer, width, height, imageData) {
        for (let i = 0; i < width * height; i++) {
            const inIdx = i * 4;
            const outIdx = i * 4;
            
            imageData[outIdx] = buffer[inIdx + 3];
            imageData[outIdx + 1] = buffer[inIdx + 2];
            imageData[outIdx + 2] = buffer[inIdx + 1];
            imageData[outIdx + 3] = buffer[inIdx];
        }
    }
}
