/**
 * record.ts
 **
 * function：音声合成
**/

// モジュール
import path from 'path'; // path
import log4js from 'log4js'; // logger
import ffmpeg from 'fluent-ffmpeg'; // ffmpeg
import { promises } from 'fs'; // fs

// Logger config
log4js.configure({
    appenders: {
        out: { type: 'stdout' },
        system: { type: 'dateFile', filename: 'logs/system.log', pattern: 'yyyyMMdd' },
        errorRaw: { type: 'dateFile', filename: 'logs/error.log', pattern: 'yyyyMMdd' },
        error: { type: 'logLevelFilter', appender: 'errorRaw', level: 'error' },
    },
    categories: {
        default: { appenders: ['out', 'system', 'error'], level: 'trace' },
    }
});
const logger: any = log4js.getLogger();

// ファイルシステム
const { readdir } = promises;

// main
(async () => {
    try {
        // サブディレクトリ一覧
        const allDirents: any = await readdir('tmp/', { withFileTypes: true });
        const dirNames: any[] = allDirents.filter((dirent: any) => dirent.isDirectory()).map(({ name }: any) => name);

        // フォルダ内ループ
        await Promise.all(dirNames.map(async (dir: any): Promise<void> => {
            return new Promise(async (resolve1, reject1) => {
                try {
                    // 対象パス
                    const targetDir: string = path.join(__dirname, 'tmp', dir);
                    // サブディレクトリ内ファイル一覧
                    const audioFiles: string[] = (await readdir(targetDir)).filter((ad: string) => path.parse(ad).ext == '.wav');

                    // ファイルパス一覧
                    const filePaths: any[] = audioFiles.map((fl: string) => {
                        return path.join(__dirname, 'tmp', dir, fl);

                    });

                    // DLパス
                    const downloadDir: string = path.join(__dirname, 'backup');
                    // 出力パス
                    const outputPath: string = path.join(__dirname, 'download', `${dir}.wav`);

                    // ffmpeg
                    let mergedVideo: any = ffmpeg();

                    // 合体
                    await Promise.all(filePaths.map(async (path: string): Promise<void> => {
                        return new Promise(async (resolve2, reject2) => {
                            try {
                                mergedVideo = mergedVideo.mergeAdd(path);
                                resolve2();

                            } catch (e: unknown) {
                                if (e instanceof Error) {
                                    logger.error(e.message);
                                    // エラー
                                    reject2();
                                }
                            }
                        });
                    }));

                    // 音声合体
                    mergedVideo.mergeToFile(outputPath, downloadDir)
                        .on('error', (err: unknown) => {
                            if (err instanceof Error) {
                                logger.error(err.message);
                            }
                        })
                        .on('end', function () {
                            logger.debug(`${dir}.wav  merge finished.`);
                        });
                    // 完了
                    resolve1();

                } catch (e: unknown) {
                    if (e instanceof Error) {
                        logger.error(e.message);
                        // エラー
                        reject1();
                    }
                }
            });
        }));
        // 完了
        logger.info('operation finished.');

    } catch (e: unknown) {
        if (e instanceof Error) {
            // エラー
            logger.error(e.message);
        }
    }
})();