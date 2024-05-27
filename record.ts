/**
 * record.ts
 **
 * function：音声合成
**/

// モジュール
import path from 'path'; // path
import iconv from 'iconv-lite'; // Text converter
import * as stream from 'stream';
import { promisify } from 'util';
import axios from 'axios';
import log4js from 'log4js'; // logger
import { createWriteStream, promises, existsSync } from 'fs'; // fs

// ポート
const PORT: number = 5000;
const HOSTNAME: string = '127.0.0.1';
//const HOSTNAME: string = '192.168.43.177';

// pipe
const finished = promisify(stream.finished);

// Logger config
const prefix: string = `logs/${(new Date().toJSON().slice(0, 10))}.log`;
const errprefix: string = `logs/err${(new Date().toJSON().slice(0, 10))}.log`;

// Logger config
log4js.configure({
    appenders: {
        out: { type: 'stdout' },
        system: { type: 'file', filename: prefix, pattern: 'yyyyMMdd' },
        errorRaw: { type: 'file', filename: errprefix, pattern: 'yyyyMMdd' },
        error: { type: 'logLevelFilter', appender: 'errorRaw', level: 'error' },
    },
    categories: {
        default: { appenders: ['out', 'system', 'error'], level: 'trace' },
    }
});
const logger: any = log4js.getLogger();

// ファイルシステム
const { readFile, readdir, mkdir, rm } = promises;

// 音声合成リクエスト
const synthesisRequest = async (filename: string, text: string, outDir: string): Promise<string> => {
    return new Promise(async (resolve, reject) => {
        try {
            logger.debug(`${filename} started.`);
            // パラメータ
            const params: any = {
                text: text, // 変換するテキスト(※必須)
                encoding: 'utf-8', // 文字コード
                model_id: 0, // 使用するモデルのID
                speaker_id: 0, // 話者のID
                // speaker_name: '', // 話者の名前(speaker_idより優先)
                sdp_ratio: 0.2, // SDPとDPの混合比率
                noise: 0.6, // サンプルノイズの割合（ランダム性増加）
                noisew: 0.8, // SDPノイズの割合（発音間隔のばらつき増加）
                length: 1.1, // 話速（1が標準）
                language: 'JP', // テキストの言語
                auto_split: true, // 自動でテキストを分割するかどうか
                split_interval: 2, // 分割した際の無音区間の長さ（秒）
                assist_text_weight: 1.0, // 補助テキストの影響の強さ
                style: 'Neutral', // 音声のスタイル
                style_weight: 5.0, // スタイルの強さ
                // reference_audio_path: '', // スタイルを音声ファイルで行う
            }

            // クエリ
            const query: any = new URLSearchParams(params);
            // リクエストURL
            const tmpUrl: string = `http://${HOSTNAME}:${PORT}/voice?${query}`;
            // リクエストURL
            const filePath: string = path.join(outDir, filename);
            // リクエストURL
            const writer = createWriteStream(filePath);
            // GETリクエスト
            await axios({
                method: 'get',
                url: tmpUrl,
                responseType: 'stream',

            }).then(async (response: any) => {
                await response.data.pipe(writer);
                await finished(writer);
                resolve(filePath); //this is a Promise
            });

        } catch (e: unknown) {
            if (e instanceof Error) {
                // エラー
                reject('error');
            }
        }
    });
}

// main
(async () => {
    try {
        // 開始
        logger.info('operation started.');

        // サブディレクトリ一覧
        const allDirents: any = await readdir('tmp/', { withFileTypes: true });
        const dirNames: any[] = allDirents.filter((dirent: any) => dirent.isDirectory()).map(({ name }: any) => name);

        if (dirNames) {
            // フォルダ内ファイルループ
            await Promise.all(dirNames.map(async (tmps: string): Promise<void> => {
                return new Promise(async (resolve0, reject0) => {
                    try {
                        // 削除対象パス
                        const delFilePath: string = path.join(__dirname, 'tmp', tmps);
                        logger.debug(`deleting ${tmps}`);
                        await rm(delFilePath, { recursive: true });
                        resolve0();

                    } catch (e: unknown) {
                        if (e instanceof Error) {
                            logger.error(e.message);
                            // エラー
                            reject0();
                        }
                    }
                });
            }));

        } else {
            logger.debug('no directory in /tmp.');
        }

        // ファイル一覧
        const files: string[] = await readdir('txt/');

        // フォルダ内ファイルループ
        await Promise.all(files.map(async (fl: string): Promise<void> => {
            return new Promise(async (resolve1, reject1) => {
                try {
                    logger.debug(`operating ${fl}`);
                    // 一時ファイル名リスト
                    let tmpFileNameArray: string[] = [];
                    // ファイル名
                    const fileName: string = path.parse(fl).name;
                    // ID
                    const fileId: string = fileName.slice(0, 5);
                    // 保存先パス
                    const outDirPath: string = path.join(__dirname, 'tmp', fileId);
                    // 保存先生成
                    if (!existsSync(outDirPath)) {
                        await mkdir(outDirPath);
                        logger.debug(`finished making.. ${outDirPath}`);
                    }
                    // ファイルパス
                    const filePath: string = path.join(__dirname, 'txt', fl);
                    // ファイル読み込み
                    const txtdata: Buffer = await readFile(filePath);
                    // デコード
                    const str: string = iconv.decode(txtdata, 'UTF8');
                    logger.debug('char decoding finished.');
                    // 改行コードで分割
                    const strArray: string[] = str.split(/\r\n/);

                    // 音声化
                    await Promise.all(strArray.map(async (st: string, index: number): Promise<void> => {
                        return new Promise(async (resolve2, reject2) => {
                            try {
                                // 一時ファイル名
                                let tmpFileName: string = '';

                                // テキストなし
                                if (st.trim().length == 0) {
                                    throw new Error('err: no length');
                                }
                                logger.debug(`synthesizing .. ${st}`);
                                // インデックス
                                const paddedIndex1: string = index.toString().padStart(3, '0');

                                // 500文字以上
                                if (st.length > 500) {
                                    // 改行コードで分割
                                    const subStrArray: string[] = st.split(/。/);
                                    // 音声化
                                    await Promise.all(subStrArray.map(async (sb: string, idx: number): Promise<void> => {
                                        return new Promise(async (resolve3, reject3) => {
                                            try {
                                                // インデックス
                                                const paddedIndex2: string = idx.toString().padStart(3, '0');
                                                // ファイル名
                                                tmpFileName = `${fileId}-${paddedIndex1}${paddedIndex2}.wav`;
                                                // 音声リクエスト
                                                await synthesisRequest(tmpFileName, sb, outDirPath);
                                                // リスト追加
                                                tmpFileNameArray.push(tmpFileName);
                                                // 完了
                                                resolve3();

                                            } catch (e: unknown) {
                                                if (e instanceof Error) {
                                                    logger.error(e.message);
                                                    // エラー
                                                    reject3();
                                                }
                                            }
                                        })
                                    }));

                                } else {
                                    // ファイル名
                                    tmpFileName = `${fileId}-${paddedIndex1}.wav`;
                                    // 音声リクエスト
                                    await synthesisRequest(tmpFileName, st, outDirPath);
                                    // リスト追加
                                    tmpFileNameArray.push(tmpFileName);
                                }
                                logger.debug(`${tmpFileName} finished.`);
                                // 完了
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