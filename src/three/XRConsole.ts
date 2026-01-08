import { XRConsoleFactory } from 'logxr';

export function createXRConsole() {
    // 1. 创建控制台实例
    const xrConsole = XRConsoleFactory.getInstance().createConsole({
        pixelWidth: 512,
        pixelHeight: 256,
        actualWidth: 0.4,   // 3D 空间中的实际宽度（米）
        actualHeight: 0.2,  // 3D 空间中的实际高度（米）
        fontSize: 12,
        backgroundColor: '#000000',
        opacity: 0.8
    });
    return xrConsole;
}