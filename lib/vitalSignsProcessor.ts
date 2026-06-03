// ═══════════════════════════════════════════════════════════════
//  VITAL SIGNS PROCESSOR
//  Uso: const processor = createVitalSignsProcessor();
//       processor.processSample(irVal, redVal, Date.now());
// ═══════════════════════════════════════════════════════════════

export interface VitalSignsResult {
  heartRate: number;
  instantBPM: number;
  spo2: number;
  validSPO2: boolean;
  respiratoryRate: number | null;
  fingerDetected: boolean;
  beatCount: number;
}

export function createVitalSignsProcessor() {

  const RATE_SIZE        = 2;
  const SPO2_BUFFER_LEN  = 20;
  const MAX_BEATS        = 120;
  const FFT_SAMPLES      = 32;
  const RESAMPLE_FREQ    = 4.0;
  const RESP_FREQ_MIN    = 0.15;
  const RESP_FREQ_MAX    = 0.40;
  const RR_MIN_MS        = 300;
  const RR_MAX_MS        = 1500;
  const IR_FINGER_THRESH = 5000;
  const EDR_SMOOTH_WIN   = 3;
  const FR_CALC_INTERVAL = 2000;

  let state = {
    rates:          new Array(RATE_SIZE).fill(0),
    rateSpot:       0,
    lastBeat_ms:    0,
    beatsPerMin:    0,
    beatAvg:        0,
    spo2:           0,
    validSPO2:      false,
    rrIntervals_ms: new Array(MAX_BEATS).fill(0),
    peakAmplitudes: new Array(MAX_BEATS).fill(0),
    beatTimestamps: new Array(MAX_BEATS).fill(0),
    beatCount:      0,
    frFusion_rpm:   0,
    frValida:       false,
    irBuf:          new Array(SPO2_BUFFER_LEN).fill(0),
    redBuf:         new Array(SPO2_BUFFER_LEN).fill(0),
    lastIR:         0,
    lastFR_ms:      0,
    prevIR:         0,
    filterBuf:      new Array(4).fill(0),
  };

  // ── Detección de latido por pendiente ──────────────────────────
  function checkForBeat(currentVal: number): boolean {
    const slope = currentVal - state.prevIR;
    state.prevIR = currentVal;
    return slope > 30; // Lowered because red signal might have smaller amplitude
  }

  // ── Buffer circular de latidos ─────────────────────────────────
  function almacenarLatido(rr_ms: number, amplitud: number, timestamp_ms: number) {
    if (state.beatCount < MAX_BEATS) {
      state.rrIntervals_ms[state.beatCount] = rr_ms;
      state.peakAmplitudes[state.beatCount] = amplitud;
      state.beatTimestamps[state.beatCount] = timestamp_ms;
      state.beatCount++;
    } else {
      state.rrIntervals_ms.copyWithin(0, 1);
      state.peakAmplitudes.copyWithin(0, 1);
      state.beatTimestamps.copyWithin(0, 1);
      state.rrIntervals_ms[MAX_BEATS - 1] = rr_ms;
      state.peakAmplitudes[MAX_BEATS - 1] = amplitud;
      state.beatTimestamps[MAX_BEATS - 1] = timestamp_ms;
    }
  }

  // ── Remuestreo uniforme a RESAMPLE_FREQ Hz ─────────────────────
  function remuestrear(srcValues: number[]): number[] | null {
    if (state.beatCount < 4) return null;
    const tEnd   = state.beatTimestamps[state.beatCount - 1];
    const tStart = state.beatTimestamps[0];
    const durSeg = (tEnd - tStart) / 1000.0;
    const durMin = FFT_SAMPLES / RESAMPLE_FREQ;
    if (durSeg < durMin) return null;

    const tIni = tEnd - durMin * 1000.0;
    const out  = new Array(FFT_SAMPLES).fill(0);
    let n = 0;

    for (let i = 0; i < FFT_SAMPLES; i++) {
      const t = tIni + i * (1000.0 / RESAMPLE_FREQ);
      for (let j = 0; j < state.beatCount - 1; j++) {
        const t0 = state.beatTimestamps[j];
        const t1 = state.beatTimestamps[j + 1];
        if (t0 <= t && t <= t1) {
          const span  = t1 - t0;
          const alpha = span > 0 ? (t - t0) / span : 0;
          out[n++]    = srcValues[j] + alpha * (srcValues[j + 1] - srcValues[j]);
          break;
        }
      }
      if (n === 0 && i === 0) return null;
    }
    return out;
  }

  // ── FFT in-place (Cooley–Tukey) ────────────────────────────────
  function fft(re: number[], im: number[]) {
    const N = re.length;
    for (let i = 1, j = 0; i < N; i++) {
      let bit = N >> 1;
      for (; j & bit; bit >>= 1) j ^= bit;
      j ^= bit;
      if (i < j) {
        [re[i], re[j]] = [re[j], re[i]];
        [im[i], im[j]] = [im[j], im[i]];
      }
    }
    for (let len = 2; len <= N; len <<= 1) {
      const ang = -2 * Math.PI / len;
      const wR  = Math.cos(ang);
      const wI  = Math.sin(ang);
      for (let i = 0; i < N; i += len) {
        let curR = 1, curI = 0;
        for (let j = 0; j < len / 2; j++) {
          const uR = re[i + j],           uI = im[i + j];
          const vR = re[i + j + len/2] * curR - im[i + j + len/2] * curI;
          const vI = re[i + j + len/2] * curI + im[i + j + len/2] * curR;
          re[i + j]         = uR + vR;  im[i + j]         = uI + vI;
          re[i + j + len/2] = uR - vR;  im[i + j + len/2] = uI - vI;
          const nr = curR * wR - curI * wI;
          curI     = curR * wI + curI * wR;
          curR     = nr;
        }
      }
    }
  }

  // ── Ventana Hann + magnitud espectral ──────────────────────────
  function hannWindow(data: number[]): number[] {
    const N = data.length;
    return data.map((v, i) => v * 0.5 * (1 - Math.cos(2 * Math.PI * i / (N - 1))));
  }

  // ── Análisis espectral de un canal (HRV o EDR) ─────────────────
  function analizarCanal(signal: number[]) {
    const N     = FFT_SAMPLES;
    const media = signal.reduce((a, b) => a + b, 0) / N;
    const re    = hannWindow(signal.map(v => v - media));
    const im    = new Array(N).fill(0);
    fft(re, im);
    const mag = re.map((v, i) => Math.sqrt(v * v + im[i] * im[i]));

    const freqRes = RESAMPLE_FREQ / N;
    const binMin  = Math.max(Math.floor(RESP_FREQ_MIN / freqRes), 1);
    const binMax  = Math.min(Math.floor(RESP_FREQ_MAX / freqRes), N / 2 - 1);

    let potBanda = 0, potTotal = 0, maxMag = -1, binPico = binMin;
    for (let b = 1; b < N / 2; b++) {
      const m2 = mag[b] * mag[b];
      potTotal += m2;
      if (b >= binMin && b <= binMax) {
        potBanda += m2;
        if (mag[b] > maxMag) { maxMag = mag[b]; binPico = b; }
      }
    }

    if (potTotal < 1e-12) return { freqHz: 0, snr: 0, valido: false };

    const snr = potBanda / potTotal;
    let freqPico = binPico * freqRes;

    if (binPico > 1 && binPico < N / 2 - 1) {
      const a   = mag[binPico - 1];
      const bv  = mag[binPico];
      const c   = mag[binPico + 1];
      const den = a - 2 * bv + c;
      if (Math.abs(den) > 1e-8) {
        const delta = 0.5 * (a - c) / den;
        freqPico = Math.max(RESP_FREQ_MIN,
                   Math.min(RESP_FREQ_MAX, (binPico + delta) * freqRes));
      }
    }

    return { freqHz: freqPico, snr, valido: snr > 0.10 };
  }

  // ── Suavizado EDR (ventana deslizante) ─────────────────────────
  function suavizarAmplitudes(): number[] {
    const n = state.beatCount;
    const w = EDR_SMOOTH_WIN;
    const dest = new Array(n);
    for (let i = 0; i < n; i++) {
      let suma = 0, cnt = 0;
      for (let k = i - w; k <= i + w; k++) {
        if (k >= 0 && k < n) { suma += state.peakAmplitudes[k]; cnt++; }
      }
      dest[i] = suma / cnt;
    }
    return dest;
  }

  // ── Fusión HRV + EDR → frecuencia respiratoria ─────────────────
  function calcularFR_fusion() {
    const rrSignal = remuestrear(state.rrIntervals_ms.slice(0, state.beatCount));
    if (!rrSignal) { state.frValida = false; return; }

    const canalHRV = analizarCanal(rrSignal);

    const ampSuav   = suavizarAmplitudes();
    let canalEDR    = { valido: false, freqHz: 0, snr: 0 };
    const edrSignal = remuestrear(ampSuav);
    if (edrSignal) canalEDR = analizarCanal(edrSignal);

    let freqFusion = 0;
    if (canalHRV.valido && canalEDR.valido) {
      const wH   = canalHRV.snr * canalHRV.snr;
      const wE   = canalEDR.snr * canalEDR.snr;
      const wSum = wH + wE;
      if (wSum > 1e-6) freqFusion = (wH * canalHRV.freqHz + wE * canalEDR.freqHz) / wSum;
    } else if (canalHRV.valido) {
      freqFusion = canalHRV.freqHz;
    } else if (canalEDR.valido) {
      freqFusion = canalEDR.freqHz;
    } else {
      state.frValida = false;
      return;
    }

    state.frFusion_rpm = freqFusion * 60.0;
    state.frValida     = true;
  }

  // ── Estimación SpO₂ por ratio RED/IR ──────────────────────────
  function estimarSpO2() {
    const irSlice  = state.irBuf.slice(-10);
    const redSlice = state.redBuf.slice(-10);
    const irAC     = irSlice.reduce((a, b) => a + b, 0)  / irSlice.length;
    const redAC    = redSlice.reduce((a, b) => a + b, 0) / redSlice.length;
    if (irAC <= IR_FINGER_THRESH || redAC <= 1000) { state.validSPO2 = false; return; }
    const ratio    = redAC / Math.max(irAC, 1);
    const estimate = Math.round(110 - 25 * ratio);
    if (estimate > 70 && estimate <= 100) {
      state.spo2      = estimate;
      state.validSPO2 = true;
    }
  }

  // ══════════════════════════════════════════════════════════════
  //  FUNCIÓN PRINCIPAL — llamar por cada muestra del sensor
  // ══════════════════════════════════════════════════════════════
  function processSample(irVal: number, redVal: number, now: number): VitalSignsResult {
    state.irBuf.shift();  state.irBuf.push(irVal);
    state.redBuf.shift(); state.redBuf.push(redVal);
    state.lastIR = irVal;

    // Use redVal for beat detection if irVal is saturated at max 18-bit value (262143)
    const rawSignal = irVal >= 262000 ? redVal : irVal;

    // Small window Moving Average filter (4 samples)
    state.filterBuf.shift();
    state.filterBuf.push(rawSignal);
    
    // Only use the filter if it's fully populated with real data to avoid startup dips
    let filteredSignal = rawSignal;
    if (state.filterBuf[0] !== 0) {
        filteredSignal = state.filterBuf.reduce((a, b) => a + b, 0) / state.filterBuf.length;
    }

    if (irVal >= IR_FINGER_THRESH || redVal >= IR_FINGER_THRESH) {
      if (checkForBeat(filteredSignal)) {
        const delta = now - state.lastBeat_ms;
        state.lastBeat_ms = now;
        state.beatsPerMin = 60000.0 / delta;

        if (state.beatsPerMin > 20 && state.beatsPerMin < 220) {
          state.rates[state.rateSpot++] = Math.round(state.beatsPerMin);
          state.rateSpot %= RATE_SIZE;
          state.beatAvg = Math.round(
            state.rates.reduce((a, b) => a + b, 0) / RATE_SIZE
          );
        }

        if (delta >= RR_MIN_MS && delta <= RR_MAX_MS) {
          almacenarLatido(delta, irVal, now);
        }
      }
      estimarSpO2();
    } else {
      if (state.beatCount > 0) {
        state.beatCount  = 0;
        state.frValida   = false;
        state.beatAvg    = 0;
        state.validSPO2  = false;
      }
    }

    if (now - state.lastFR_ms >= FR_CALC_INTERVAL) {
      state.lastFR_ms = now;
      calcularFR_fusion();
    }

    return {
      heartRate:        state.beatAvg,
      instantBPM:       Math.round(state.beatsPerMin),
      spo2:             state.spo2,
      validSPO2:        state.validSPO2,
      respiratoryRate:  state.frValida ? parseFloat(state.frFusion_rpm.toFixed(1)) : null,
      fingerDetected:   irVal >= IR_FINGER_THRESH,
      beatCount:        state.beatCount,
    };
  }

  // ── Reset completo del estado ──────────────────────────────────
  function reset() {
    state.rates          = new Array(RATE_SIZE).fill(0);
    state.rateSpot       = 0;
    state.lastBeat_ms    = 0;
    state.beatsPerMin    = 0;
    state.beatAvg        = 0;
    state.spo2           = 0;
    state.validSPO2      = false;
    state.rrIntervals_ms = new Array(MAX_BEATS).fill(0);
    state.peakAmplitudes = new Array(MAX_BEATS).fill(0);
    state.beatTimestamps = new Array(MAX_BEATS).fill(0);
    state.beatCount      = 0;
    state.frFusion_rpm   = 0;
    state.frValida       = false;
    state.irBuf          = new Array(SPO2_BUFFER_LEN).fill(0);
    state.redBuf         = new Array(SPO2_BUFFER_LEN).fill(0);
    state.lastIR         = 0;
    state.lastFR_ms      = 0;
    state.prevIR         = 0;
    state.filterBuf      = new Array(4).fill(0);
  }

  return { processSample, reset };
}
