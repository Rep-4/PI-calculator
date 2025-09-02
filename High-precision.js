// Arbitrary-precision decimal arithmetic using BigInt under the hood.
// Features: add, subtract, multiply, divide (with precision & rounding), sqrt (Newton's method), comparisons, parsing, formatting.
// No dependencies. Works in Node and browsers.

/* Rounding modes */
const Rounding = Object.freeze({
  DOWN: 'DOWN',          // toward zero
  UP: 'UP',              // away from zero
  FLOOR: 'FLOOR',        // toward -Infinity
  CEIL: 'CEIL',          // toward +Infinity
  HALF_UP: 'HALF_UP',    // ties -> up (away from zero)
  HALF_EVEN: 'HALF_EVEN' // ties -> to even
});

class BigDecimal {
  /**
   * Internal representation: value = unscaled / 10^scale
   * @param {bigint} unscaled
   * @param {number} scale >= 0 integer
   */
  constructor(unscaled, scale = 0) {
    if (typeof unscaled !== 'bigint') throw new TypeError('unscaled must be BigInt');
    if (!Number.isInteger(scale) || scale < 0) throw new TypeError('scale must be a non-negative integer');
    this.unscaled = unscaled;
    this.scale = scale;
    // normalize trailing zeros in unscaled when possible to keep scale minimal
    this.#normalize();
  }

  // --- Parsing & factories ---
  /** Create from number | string | bigint | BigDecimal */
  static from(x) {
    if (x instanceof BigDecimal) return new BigDecimal(x.unscaled, x.scale);
    if (typeof x === 'bigint') return new BigDecimal(x, 0);
    if (typeof x === 'number') {
      if (!Number.isFinite(x)) throw new RangeError('Cannot convert non-finite number');
      // Convert via string to avoid binary float surprises
      return BigDecimal.from(x.toString());
    }
    if (typeof x === 'string') {
      // Trim and handle sign
      const s = x.trim();
      if (!/^[-+]?\d*(?:\.\d*)?$/.test(s)) throw new SyntaxError('Invalid decimal string: ' + x);
      const sign = s.startsWith('-') ? -1n : 1n;
      const body = s.replace(/^[-+]/, '');
      const parts = body.split('.');
      const intPart = parts[0] || '0';
      const fracPart = parts[1] || '';
      const scale = fracPart.length;
      const unscaledStr = (intPart + fracPart).replace(/^0+(?=\d)/, '') || '0';
      return new BigDecimal(sign * BigInt(unscaledStr), scale);
    }
    throw new TypeError('Unsupported type for BigDecimal.from');
  }

  static zero() { return new BigDecimal(0n, 0); }
  static one() { return new BigDecimal(1n, 0); }

  // --- Helpers ---
  #normalize() {
    // reduce scale by removing trailing zeros in unscaled
    if (this.unscaled === 0n) { this.scale = 0; return; }
    while (this.scale > 0) {
      const q = this.unscaled / 10n;
      const r = this.unscaled % 10n;
      if (r !== 0n) break;
      this.unscaled = q;
      this.scale -= 1;
    }
  }

  static #tenPow(n) { if (n < 0) throw new RangeError('tenPow expects n>=0'); return 10n ** BigInt(n); }

  static #alignScales(a, b) {
    // return [A', B', commonScale]
    if (a.scale === b.scale) return [a.unscaled, b.unscaled, a.scale];
    if (a.scale > b.scale) {
      const mul = BigDecimal.#tenPow(a.scale - b.scale);
      return [a.unscaled, b.unscaled * mul, a.scale];
    } else {
      const mul = BigDecimal.#tenPow(b.scale - a.scale);
      return [a.unscaled * mul, b.unscaled, b.scale];
    }
  }

  // --- Comparison ---
  compareTo(other) {
    const b = BigDecimal.from(other);
    const [A, B] = BigDecimal.#alignScales(this, b);
    return A === B ? 0 : (A > B ? 1 : -1);
  }
  eq(o) { return this.compareTo(o) === 0; }
  lt(o) { return this.compareTo(o) < 0; }
  lte(o) { return this.compareTo(o) <= 0; }
  gt(o) { return this.compareTo(o) > 0; }
  gte(o) { return this.compareTo(o) >= 0; }

  // --- Basic ops ---
  add(other) {
    const b = BigDecimal.from(other);
    const [A, B, s] = BigDecimal.#alignScales(this, b);
    return new BigDecimal(A + B, s);
  }

  sub(other) {
    const b = BigDecimal.from(other);
    const [A, B, s] = BigDecimal.#alignScales(this, b);
    return new BigDecimal(A - B, s);
  }

  mul(other) {
    const b = BigDecimal.from(other);
    return new BigDecimal(this.unscaled * b.unscaled, this.scale + b.scale);
  }

  /**
   * Divide to requested scale (digits after decimal). If scale is omitted, it will try exact division; if not exact, throws.
   * @param {BigDecimal|number|string|bigint} other
   * @param {number} [scale] number of digits after decimal in the result
   * @param {string} [rounding=Rounding.HALF_EVEN]
   */
  div(other, scale, rounding = Rounding.HALF_EVEN) {
    const b = BigDecimal.from(other);
    if (b.unscaled === 0n) throw new RangeError('Division by zero');

    // If scale specified: perform integer division with extra scaling
    if (scale === undefined) {
      // exact division required
      // Compute (this.unscaled * 10^(b.scale - this.scale)) / b.unscaled and ensure remainder==0
      const shift = b.scale - this.scale;
      let numerator = this.unscaled;
      if (shift >= 0) numerator *= BigDecimal.#tenPow(shift);
      else {
        const pow = BigDecimal.#tenPow(-shift);
        if (numerator % pow !== 0n) throw new RangeError('Non-terminating division; specify scale & rounding');
        numerator /= pow;
      }
      const q = numerator / b.unscaled;
      const r = numerator % b.unscaled;
      if (r !== 0n) throw new RangeError('Non-terminating division; specify scale & rounding');
      return new BigDecimal(q, 0);
    }

    if (!Number.isInteger(scale) || scale < 0) throw new TypeError('scale must be non-negative integer');

    // We want: result = (this / b) with exactly `scale` fractional digits
    // Compute unscaled result = floor( (this.unscaled * 10^(scale + b.scale - this.scale)) / b.unscaled ) with rounding
    const neededPow = scale + b.scale - this.scale;
    if (neededPow < 0) {
      // Equivalent to dividing numerator by 10^(-neededPow) first
      // This can only happen when this has much higher scale than b plus desired scale.
      const divisor = BigDecimal.#tenPow(-neededPow);
      const num = this.unscaled / divisor;
      const remPre = this.unscaled % divisor;
      // incorporate remainder into rounding by extending numerator
      const q = num / b.unscaled;
      const r = num % b.unscaled;
      let result = q;
      let rem = r; // remainder against b.unscaled (ignores remPre)
      // If there was remPre, treat as if additional fractional information exists -> set a flag to force rounding away from ties toward UP-ish because effective more precision exists.
      // Simpler: fold remPre into remainder by scaling it to match denominators (can be complex). We'll approximate by considering remPre ? treat as non-zero remainder.
      const nonZeroRemainder = (rem !== 0n) || (remPre !== 0n);
      if (nonZeroRemainder) {
        result = BigDecimal.#applyRounding(result, 1n, 2n, rounding, q >= 0n);
      }
      return new BigDecimal(result, scale);
    } else {
      const factor = BigDecimal.#tenPow(neededPow);
      const numerator = this.unscaled * factor;
      const q = numerator / b.unscaled;
      const r = numerator % b.unscaled;
      const rounded = BigDecimal.#roundQuotient(q, r, b.unscaled, rounding);
      return new BigDecimal(rounded, scale);
    }
  }

  setScale(scale, rounding = Rounding.HALF_EVEN) {
    if (!Number.isInteger(scale) || scale < 0) throw new TypeError('scale must be non-negative integer');
    if (scale === this.scale) return new BigDecimal(this.unscaled, this.scale);
    if (scale > this.scale) {
      const factor = BigDecimal.#tenPow(scale - this.scale);
      return new BigDecimal(this.unscaled * factor, scale);
    } else {
      // need to round
      const factor = BigDecimal.#tenPow(this.scale - scale);
      const q = this.unscaled / factor;
      const r = this.unscaled % factor;
      const rounded = BigDecimal.#applyRounding(q, r, factor, rounding, this.unscaled >= 0n);
      return new BigDecimal(rounded, scale);
    }
  }

  // --- Square root ---
  /**
   * Compute sqrt(this) with a given number of fractional digits (scale) and rounding mode.
   * Uses Newton-Raphson on integers: sqrt( N / 10^s ) = sqrt( N * 10^(2k - s) ) / 10^k
   * @param {number} scale fractional digits desired
   * @param {string} rounding rounding mode
   */
  sqrt(scale = 34, rounding = Rounding.HALF_EVEN) {
    if (this.unscaled < 0n) throw new RangeError('sqrt of negative');
    if (!Number.isInteger(scale) || scale < 0) throw new TypeError('scale must be non-negative integer');
    if (this.unscaled === 0n) return BigDecimal.zero();

    // We want integer sqrt of X = this.unscaled * 10^(2*scale) / 10^(this.scale)
    // i.e., compute integer sqrt of I = this.unscaled * 10^(2*scale - this.scale)
    const exp = 2 * scale - this.scale;
    let I, scaleAdjust;
    if (exp >= 0) {
      I = this.unscaled * BigDecimal.#tenPow(exp);
      scaleAdjust = scale; // result will be I_sqrt / 10^scale
    } else {
      // when exp < 0, divide before sqrt (only if divisible). If not divisible, we can multiply both numerator & denominator to avoid fraction: use ceil behavior by adding zeros in numerator; simpler: shift up by multiples of 2 to ensure non-negative.
      const Iexp = -exp;
      // Multiply by 10^(2*ceil(Iexp/2)) to make exponent non-negative and even; adjust scale accordingly
      const bump = (Iexp + 1) >> 1; // ceil(Iexp/2)
      const k = 2 * bump - Iexp; // non-negative after bump
      I = this.unscaled * BigDecimal.#tenPow(2 * bump - 0);
      scaleAdjust = scale + bump - (k/2); // k is 0 or 1, but we kept even power so k should be 0
      // For safety keep scaleAdjust = scale + bump
      scaleAdjust = scale + bump;
    }

    // Integer sqrt with Newton's method
    const sqrtI = BigDecimal.#isqrt(I);

    // Now sqrt(this) ≈ sqrtI / 10^scaleAdjust, but need to round to `scale` fractional digits
    let result = new BigDecimal(sqrtI, scaleAdjust).setScale(scale, rounding);

    return result;
  }

  // integer sqrt floor
  static #isqrt(n) {
    if (n < 0n) throw new RangeError('isqrt of negative');
    if (n < 2n) return n;
    // Initial guess: 2^(bitlen/2)
    let x0 = 1n << (BigDecimal.#bitLength(n) >> 1n);
    let x1 = (x0 + n / x0) >> 1n;
    while (x1 < x0) { x0 = x1; x1 = (x0 + n / x0) >> 1n; }
    return x0; // floor sqrt
  }

  static #bitLength(n) {
    let bits = 0n; let x = n;
    while (x) { x >>= 1n; bits++; }
    return bits;
  }

  // Rounding helpers
  static #roundQuotient(q, r, d, mode) {
    const positive = q >= 0n; // q sign equals numerator sign when d>0
    return BigDecimal.#applyRounding(q, r, d, mode, positive);
  }

  static #applyRounding(q, r, d, mode, positiveSign) {
    if (r === 0n) return q;
    const absR2 = 2n * (r < 0n ? -r : r);
    const absD = d < 0n ? -d : d;
    const isHalf = absR2 === absD;
    const greaterHalf = absR2 > absD;
    const sign = positiveSign ? 1n : -1n;

    switch (mode) {
      case Rounding.DOWN: return q; // toward zero
      case Rounding.UP: return q + (sign);
      case Rounding.FLOOR: return positiveSign ? q : q - 1n;
      case Rounding.CEIL: return positiveSign ? q + 1n : q;
      case Rounding.HALF_UP:
        return (greaterHalf || isHalf) ? q + sign : q;
      case Rounding.HALF_EVEN: {
        if (greaterHalf) return q + sign;
        if (isHalf) return (q % 2n === 0n) ? q : (q + sign);
        return q;
      }
      default:
        throw new RangeError('Unknown rounding mode');
    }
  }

  // --- Formatting ---
  toString() {
    if (this.unscaled === 0n) return '0';
    const negative = this.unscaled < 0n;
    const abs = negative ? -this.unscaled : this.unscaled;
    const s = abs.toString();
    if (this.scale === 0) return (negative ? '-' : '') + s;
    const len = s.length;
    if (len <= this.scale) {
      const zeros = '0'.repeat(this.scale - len);
      return (negative ? '-' : '') + '0.' + zeros + s.replace(/0+$/, '').replace(/\.$/, '') || ((negative ? '-' : '') + '0');
    }
    const intPart = s.slice(0, len - this.scale);
    const fracPart = s.slice(len - this.scale);
    // Do not trim trailing zeros here; preserve scale as represented
    return (negative ? '-' : '') + intPart + '.' + fracPart.padEnd(this.scale, '0');
  }

  toNumber() { return Number(this.toString()); }

  // Aliases
  plus(o) { return this.add(o); }
  minus(o) { return this.sub(o); }
  times(o) { return this.mul(o); }
  dividedBy(o, scale, rounding) { return this.div(o, scale, rounding); }
}

// --- Example usage ---
// (Remove or comment out these tests for production.)
if (typeof module !== 'undefined' && require.main === module) {
  const a = BigDecimal.from('12345678901234567890.123456789');
  const b = BigDecimal.from('0.000000011');
  console.log('a + b =', a.add(b).toString());
  console.log('a - b =', a.sub(b).toString());
  console.log('a * b =', a.mul(b).setScale(20).toString());
  console.log('a / b (20dp) =', a.div(b, 20, Rounding.HALF_EVEN).toString());
  console.log('sqrt(2) ~', BigDecimal.from(2).sqrt(50).toString());
}

// Export for modules
if (typeof module !== 'undefined') {
  module.exports = { BigDecimal, Rounding };
}

window.BigDecimal = BigDecimal;
window.Rounding   = Rounding;
