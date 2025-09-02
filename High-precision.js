/**
 * 任意精度演算ライブラリ
 *
 * このライブラリは、JavaScriptの標準的なNumber型が持つ精度限界を超えて、
 * 文字列として表現された数値を扱うことで、任意精度の四則演算および平方根の計算を提供します。
 *
 * 主な機能:
 * - add(a, b): 加算
 * - subtract(a, b): 減算
 * - multiply(a, b): 乗算
 * - divide(a, b, precision): 除算 (precisionで小数点以下の桁数を指定)
 * - sqrt(n, precision): 平方根 (precisionで小数点以下の桁数を指定)
 *
 * 使い方:
 * const result = BigNumber.add("123.45", "67.89");
 * console.log(result); // "191.34"
 *
 * const sqrtResult = BigNumber.sqrt("2", 50);
 * console.log(sqrtResult); // 2の平方根を小数点以下50桁まで計算
 */
const BigNumber = {

    /**
     * 文字列から不要な先行ゼロや後行ゼロを削除し、正規化する内部関数
     * @param {string} numStr - 数値文字列
     * @returns {string} 正規化された数値文字列
     */
    _normalize: function (numStr) {
        let [integerPart, fractionalPart] = numStr.split('.');
        
        // 先行ゼロを削除 (例: "007" -> "7", "0.5" -> ".5" -> "0.5")
        if (integerPart) {
            integerPart = integerPart.replace(/^0+/, '');
            if (integerPart === '') {
                integerPart = '0';
            }
        } else {
            integerPart = '0';
        }

        if (fractionalPart) {
            // 後行ゼロを削除 (例: "1.2300" -> "1.23")
            fractionalPart = fractionalPart.replace(/0+$/, '');
            if (fractionalPart === '') {
                return integerPart;
            }
            return `${integerPart}.${fractionalPart}`;
        }
        
        return integerPart;
    },

    /**
     * 2つの数値文字列の絶対値を比較する内部関数
     * @param {string} a - 数値文字列 A
     * @param {string} b - 数値文字列 B
     * @returns {number} a > b なら 1, a < b なら -1, a === b なら 0
     */
    _compare: function(a, b) {
        a = this._normalize(a.replace('-', ''));
        b = this._normalize(b.replace('-', ''));

        let [aInt, aFrac] = a.split('.');
        let [bInt, bFrac] = b.split('.');
        aFrac = aFrac || '';
        bFrac = bFrac || '';

        if (aInt.length > bInt.length) return 1;
        if (aInt.length < bInt.length) return -1;
        
        if (aInt > bInt) return 1;
        if (aInt < bInt) return -1;

        // 整数部分が同じ場合は小数部分を比較
        let len = Math.max(aFrac.length, bFrac.length);
        aFrac = aFrac.padEnd(len, '0');
        bFrac = bFrac.padEnd(len, '0');
        
        if (aFrac > bFrac) return 1;
        if (aFrac < bFrac) return -1;

        return 0;
    },

    /**
     * 加算: a + b
     * @param {string} a - 数値文字列
     * @param {string} b - 数値文字列
     * @returns {string} 計算結果
     */
    add: function(a, b) {
        // 符号が異なる場合は減算に置き換える
        if (a.startsWith('-') && !b.startsWith('-')) {
            return this.subtract(b, a.slice(1));
        }
        if (!a.startsWith('-') && b.startsWith('-')) {
            return this.subtract(a, b.slice(1));
        }
        
        let sign = '';
        if (a.startsWith('-') && b.startsWith('-')) {
            sign = '-';
            a = a.slice(1);
            b = b.slice(1);
        }

        let [aInt, aFrac] = a.split('.');
        let [bInt, bFrac] = b.split('.');
        aFrac = aFrac || '';
        bFrac = bFrac || '';

        // 小数部分の長さを揃える
        const fracLen = Math.max(aFrac.length, bFrac.length);
        aFrac = aFrac.padEnd(fracLen, '0');
        bFrac = bFrac.padEnd(fracLen, '0');

        // 整数部分の長さを揃える
        const intLen = Math.max(aInt.length, bInt.length);
        aInt = aInt.padStart(intLen, '0');
        bInt = bInt.padStart(intLen, '0');

        const numA = aInt + aFrac;
        const numB = bInt + bFrac;
        let carry = 0;
        let result = '';

        for (let i = numA.length - 1; i >= 0; i--) {
            const sum = parseInt(numA[i]) + parseInt(numB[i]) + carry;
            result = (sum % 10) + result;
            carry = Math.floor(sum / 10);
        }
        if (carry > 0) {
            result = carry + result;
        }

        let resultInt, resultFrac;
        if (fracLen > 0) {
            resultInt = result.slice(0, -fracLen);
            resultFrac = result.slice(-fracLen);
            return sign + this._normalize(`${resultInt || '0'}.${resultFrac}`);
        }
        return sign + this._normalize(result);
    },

    /**
     * 減算: a - b
     * @param {string} a - 数値文字列
     * @param {string} b - 数値文字列
     * @returns {string} 計算結果
     */
    subtract: function(a, b) {
        if (a.startsWith('-') && !b.startsWith('-')) {
            return this.add(a, '-' + b);
        }
        if (!a.startsWith('-') && b.startsWith('-')) {
            return this.add(a, b.slice(1));
        }
        if (a.startsWith('-') && b.startsWith('-')) {
            return this.subtract(b.slice(1), a.slice(1));
        }

        const comparison = this._compare(a, b);
        if (comparison === 0) return '0';

        let sign = '';
        if (comparison === -1) {
            sign = '-';
            [a, b] = [b, a]; // aがbより大きいことを保証する
        }

        let [aInt, aFrac] = a.split('.');
        let [bInt, bFrac] = b.split('.');
        aFrac = aFrac || '';
        bFrac = bFrac || '';
        
        const fracLen = Math.max(aFrac.length, bFrac.length);
        aFrac = aFrac.padEnd(fracLen, '0');
        bFrac = bFrac.padEnd(fracLen, '0');

        let numA = aInt + aFrac;
        let numB = bInt.padStart(aInt.length, '0') + bFrac;

        let borrow = 0;
        let result = '';
        for (let i = numA.length - 1; i >= 0; i--) {
            let diff = parseInt(numA[i]) - parseInt(numB[i]) - borrow;
            if (diff < 0) {
                diff += 10;
                borrow = 1;
            } else {
                borrow = 0;
            }
            result = diff + result;
        }

        let resultInt, resultFrac;
        if (fracLen > 0) {
            resultInt = result.slice(0, -fracLen);
            resultFrac = result.slice(-fracLen);
            return sign + this._normalize(`${resultInt || '0'}.${resultFrac}`);
        }
        return sign + this._normalize(result);
    },

    /**
     * 乗算: a * b
     * @param {string} a - 数値文字列
     * @param {string} b - 数値文字列
     * @returns {string} 計算結果
     */
    multiply: function(a, b) {
        if (a === '0' || b === '0') return '0';

        let sign = '';
        if ((a.startsWith('-') && !b.startsWith('-')) || (!a.startsWith('-') && b.startsWith('-'))) {
            sign = '-';
        }
        a = a.replace('-', '');
        b = b.replace('-', '');

        const aFracLen = (a.split('.')[1] || '').length;
        const bFracLen = (b.split('.')[1] || '').length;
        const totalFracLen = aFracLen + bFracLen;

        let numA = a.replace('.', '');
        let numB = b.replace('.', '');

        if (numA.length < numB.length) {
            [numA, numB] = [numB, numA];
        }

        let result = '0';
        for (let i = numB.length - 1; i >= 0; i--) {
            let carry = 0;
            let partialProduct = '';
            for (let j = numA.length - 1; j >= 0; j--) {
                const product = parseInt(numA[j]) * parseInt(numB[i]) + carry;
                partialProduct = (product % 10) + partialProduct;
                carry = Math.floor(product / 10);
            }
            if (carry > 0) {
                partialProduct = carry + partialProduct;
            }
            partialProduct += '0'.repeat(numB.length - 1 - i);
            result = this.add(result, partialProduct);
        }

        if (totalFracLen > 0) {
            const resultLen = result.length;
            if (resultLen <= totalFracLen) {
                result = '0'.repeat(totalFracLen - resultLen + 1) + result;
            }
            const decimalPos = result.length - totalFracLen;
            result = result.slice(0, decimalPos) + '.' + result.slice(decimalPos);
        }

        return sign + this._normalize(result);
    },

    /**
     * 除算: a / b
     * @param {string} a - 被除数
     * @param {string} b - 除数
     * @param {number} [precision=50] - 小数点以下の計算精度
     * @returns {string} 計算結果
     */

    divide: function(a, b, precision = 50) {
        if (b === '0' || b === '-0') {
            throw new Error("Division by zero.");
        }
        if (a === '0' || a === '-0') return '0';

        let sign = '';
        if ((a.startsWith('-') && !b.startsWith('-')) || (!a.startsWith('-') && b.startsWith('-'))) {
            sign = '-';
        }
        const origA_noSign = a.replace('-', '');
        const origB_noSign = b.replace('-', '');

        let bFracLen = (origB_noSign.split('.')[1] || '').length;
        let divisor = this._normalize(origB_noSign.replace('.', ''));

        let aFracLen = (origA_noSign.split('.')[1] || '').length;
        let dividend = this._normalize(origA_noSign.replace('.', ''));
        if (bFracLen <= aFracLen) {
            divisor = divisor + '0'.repeat(aFracLen - bFracLen);
        } else {
            dividend = dividend + '0'.repeat(bFracLen - aFracLen);
        }

        //console.log(a,b,dividend, divisor);

        let quotient = '';
        let stock = [...dividend,...'0'.repeat(precision+5)].join('');
        let remainder = '';
        let i = 0;
        let j = 0;
        while (i<precision) {
            let qDigit = 0;
            remainder += stock[j];
            //console.log(i,quotient,remainder);
            while (this._compare(remainder, divisor) >= 0) {
                remainder = this.subtract(remainder, divisor);
                qDigit++;
            }
            quotient += qDigit;

            if (i!=0 || qDigit!=0){
                i++
            }
            j++;
            if (j == dividend.length) {
                quotient += '.';
            }
        }
        //console.log(quotient);
        
        
        quotient = this._normalize(quotient);
        if (quotient === '') quotient = '0';
        if (quotient === '.') quotient = '0';
        if (quotient.startsWith('.')) quotient = '0' + quotient;
        if (quotient.endsWith('.')) quotient = quotient + '0';

        //console.log(i,quotient);
        return sign + quotient;
    },



    /**
     * 平方根: sqrt(n)
     * @param {string} n - 数値文字列
     * @param {number} [precision=50] - 小数点以下の計算精度
     * @returns {string} 計算結果
     */
    sqrt: function(n, precision = 50) {
        if (n.startsWith('-')) {
            throw new Error("Cannot calculate square root of a negative number.");
        }
        if (n === '0') return '0';

        const internalPrecision = precision + 5;
        
        // 初期値を設定
        let x = '1';
        const nIntLen = (n.split('.')[0] || '').length;
        if (nIntLen > 1) {
           x += '0'.repeat(Math.floor((nIntLen - 1) / 2));
        }

        let lastX = '';
        // ニュートン法で収束させる
        for (let i = 0; i < 100; i++) { // 無限ループを避けるため最大反復回数を設定
            if (x === lastX) break;
            lastX = x;
            
            const n_div_x = this.divide(n, x, internalPrecision);
            const sum = this.add(x, n_div_x);
            x = this.divide(sum, '2', internalPrecision);
            
            // 精度に達したら終了
            let [xInt, xFrac] = x.split('.');
            xFrac = xFrac || '';
            if (xFrac.length >= precision) {
                 const truncatedX = `${xInt}.${xFrac.slice(0, precision)}`;
                 const truncatedLastX = `${lastX.split('.')[0]}.${(lastX.split('.')[1] || '').slice(0, precision)}`;
                 if (truncatedX === truncatedLastX) {
                     break;
                 }
            }
        }

        // 最終的な精度に整形
        let [xInt, xFrac] = x.split('.');
        xFrac = xFrac || '';
        if (xFrac.length > precision) {
            xFrac = xFrac.slice(0, precision);
        }
        
        return this._normalize(`${xInt}.${xFrac}`);
    }
};

/*// --- 使用例 ---
console.log("--- 任意精度計算ライブラリの使用例 ---");

// 加算
const sum = BigNumber.add("12345678901234567890.12345", "98765432109876543210.98765");
console.log("加算:", sum); // 111111111011111111101.1111

// 減算
const diff = BigNumber.subtract("100000000000000000000", "0.00000000000000000001");
console.log("減算:", diff); // 99999999999999999999.99999999999999999999

// 乗算
const prod = BigNumber.multiply("12345.6789", "9876.54321");
console.log("乗算:", prod); // 121932631.13535269

// 除算 (精度50桁)
const quot = BigNumber.divide("1", "7", 50);
console.log("除算 (1/7):", quot); // 0.14285714285714285714285714285714285714285714285714

// 平方根 (精度100桁)
console.log("平方根 (√2):");
const sqrt2 = BigNumber.sqrt("2", 100);
console.log(sqrt2); // 1.4142135623730950488016887242096980785696718753769480731766797379907324784621070388503875343276415727


*/
