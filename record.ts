/**
 * record.ts
 **
 * function：音声合成
**/

// モジュール
import os from 'os'; // os
import path from 'path'; // path
import iconv from 'iconv-lite'; // Text converter
import fetch from 'node-fetch'; // http
import log4js from 'log4js'; // logger
import { promises } from 'fs'; // fs

// ポート
const PORT: number = 5000;
const HOSTNAME: string = '127.0.0.1';

// POSTパラメータ
interface styleparam {
    text: string; // 変換するテキスト
    encoding?: string; // 話者のID
    model_id?: number; // 使用するモデルのID Default: 0
    speaker_id?: number; // 話者のID Default: 0
    speaker_name?: number; // 話者の名前(speaker_idより優先)
    sdp_ratio?: number; // SDP（Stochastic Duration Predictor）とDP（Duration Predictor）の混合比率 Default: 0.2
    noise?: number; // サンプルノイズの割合（ランダム性を増加させる）Default: 0.6
    noisew?: number; // SDPノイズの割合（発音の間隔のばらつきを増加させる）Default: 0.8
    length?: number; // 話速（1が標準）Default: 1
    language?: string; // テキストの言語 Default: JP
    auto_split?: boolean; // 自動でテキストを分割するかどうか Default: true
    split_interval?: number; // 分割した際の無音区間の長さ（秒）Default: 0.5
    assist_text?: string; // 補助テキストの影響の強さ
    assist_text_weight?: number; // 補助テキストの影響の強さ Default: 1
    style?: string; // 音声のスタイル Default: Neutral
    style_weight?: number; // スタイルの強さ Default: 5
    reference_audio_path?: string; // スタイルを音声ファイルで行う
}

// Logger config
const prefix: string = `logs/${(new Date().toJSON().slice(0, 10))}.log`

// ロガー設定
log4js.configure({
    appenders: {
        out: { type: 'stdout' },
        system: { type: 'file', filename: prefix }
    },
    categories: {
        default: { appenders: ['out', 'system'], level: 'debug' }
    }
});
const logger: any = log4js.getLogger();

// ファイルシステム
const { readFile, readdir } = promises;

// 音声合成リクエスト
const synthesisRequest = async (text: string): Promise<void> => {
    return new Promise(async (resolve, reject) => {
        try {
            // テストパラメータ
            const testparam: any = {
                text: text,
            };

            // パラメータ
            const params: styleparam = {
                text: text, // 変換するテキスト(必須)
                encoding: 'utf-8',
                speaker_id: 0,
                model_id: 0,
                sdp_ratio: 0.2,
                noise: 0.6, // サンプルノイズの割合（ランダム性を増加させる）
                noisew: 0.8, // SDPノイズの割合（発音の間隔のばらつきを増加させる）
                length: 0.9, // 話速（1が標準）
                language: 'JP', // テキストの言語
                auto_split: true, // 自動でテキストを分割するかどうか
                split_interval: 1, // 分割した際の無音区間の長さ（秒）
                assist_text_weight: 1.0, // 補助テキストの影響の強さ
                style: 'Neutral', // 音声のスタイル
                style_weight: 5.0, // スタイルの強さ
            }

            // リクエスト
            const response: any = await fetch(`http://${HOSTNAME}:${PORT}/voice`, {
                method: 'post',
                body: JSON.stringify(params),
                headers: { 'Content-Type': 'application/json' }
            });
            const data = await response.json();

            console.log(data);
            // 完了
            resolve();

        } catch (e: unknown) {
            if (e instanceof Error) {
                // エラー
                reject();
            }
        }
    });
}

// test
(async () => {
    try {
        // 音声リクエスト
        await synthesisRequest('あいうえお');
        console.log('finished.');

    } catch (e: unknown) {
        if (e instanceof Error) {
            // エラー
            logger.error(e.message);
        }
    }
})();

/*
// main
(async () => {
    try {
        // ファイル一覧
        const files: string[] = await readdir('txt/');

        // 全ループ
        await Promise.all(files.map((fl: string): Promise<void> => {
            return new Promise(async (resolve1, reject1) => {
                try {
                    // ファイルパス
                    const filePath: string = path.join(__dirname, 'txt', fl);
                    // ファイル読み込み
                    const txtdata: Buffer = await readFile(filePath);
                    // デコード
                    const str: string = iconv.decode(txtdata, 'UTF8');
                    logger.debug('char decoding finished.');
                    // 改行コードで分割
                    const strArray: string[] = str.split(/\r\n/);

                    // 全処理
                    await Promise.all(strArray.map(async (str: string): Promise<void> => {
                        return new Promise(async (resolve2, reject2) => {
                            try {
                                // 500文字以上
                                if (str.length > 500) {
                                    // 改行コードで分割
                                    const subStrArray: string[] = str.split(/。/);
                                    // 全処理
                                    await Promise.all(subStrArray.map(async (sb: string): Promise<void> => {
                                        return new Promise(async (resolve3, reject3) => {
                                            try {
                                                // 音声リクエスト
                                                await synthesisRequest(sb);
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
                                    // 音声リクエスト
                                    await synthesisRequest(str);
                                    // 完了
                                    resolve2();
                                }

                            } catch (e: unknown) {
                                if (e instanceof Error) {
                                    logger.error(e.message);
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
*/