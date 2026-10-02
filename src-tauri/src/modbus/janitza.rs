use crate::modbus::client::ModbusTcpClient;
use std::time::Duration;
use tokio::time::sleep;

/// Supported Janitza models. Each model has its own Modbus register map.
#[derive(Debug, Clone, Copy, PartialEq)]
pub enum ModeloJanitza {
    Umg509,
    Umg503,
}

/// Janitza variable definitions. Each variable occupies 2 consecutive registers
/// forming a float IEEE 754 big-endian. The register address depends on the model.
///
/// Note: energy variables (E1, E2, E3) exist only on the UMG509.
#[derive(Debug, Clone, Copy)]
pub enum JanitzaVar {
    V1, V2, V3,
    C1, C2, C3,
    P1, P2, P3,
    F,
    E1, E2, E3,
    Fp1, Fp2, Fp3,
    Thd1, Thd2, Thd3,
}

impl JanitzaVar {
    /// Get the starting Modbus register address for this variable on the given model.
    /// Returns None if the variable is not available on that model (e.g. energy on UMG503).
    pub fn registro_inicio(&self, modelo: ModeloJanitza) -> Option<u16> {
        match modelo {
            ModeloJanitza::Umg509 => Some(self.registro_inicio_509()),
            ModeloJanitza::Umg503 => self.registro_inicio_503(),
        }
    }

    /// UMG509-PRO register map (float, IEEE 754 big-endian, base 19000)
    fn registro_inicio_509(&self) -> u16 {
        match self {
            JanitzaVar::V1 => 19000,
            JanitzaVar::V2 => 19002,
            JanitzaVar::V3 => 19004,
            JanitzaVar::C1 => 19012,
            JanitzaVar::C2 => 19014,
            JanitzaVar::C3 => 19016,
            JanitzaVar::P1 => 19020,
            JanitzaVar::P2 => 19022,
            JanitzaVar::P3 => 19024,
            JanitzaVar::F  => 19050,
            JanitzaVar::E1 => 19054,
            JanitzaVar::E2 => 19056,
            JanitzaVar::E3 => 19058,
            JanitzaVar::Fp1 => 19044,
            JanitzaVar::Fp2 => 19046,
            JanitzaVar::Fp3 => 19048,
            JanitzaVar::Thd1 => 19110,
            JanitzaVar::Thd2 => 19112,
            JanitzaVar::Thd3 => 19114,
        }
    }

    /// UMG503 register map (float, IEEE 754 big-endian, word-high-first).
    /// Addresses per Table 1a of the UMG503 manual (base 0 / physical address).
    /// Energy and power factor are not exposed on this model.
    fn registro_inicio_503(&self) -> Option<u16> {
        match self {
            // Voltages phase-to-neutral
            JanitzaVar::V1 => Some(1012),
            JanitzaVar::V2 => Some(1014),
            JanitzaVar::V3 => Some(1016),
            // Line currents
            JanitzaVar::C1 => Some(1000),
            JanitzaVar::C2 => Some(1002),
            JanitzaVar::C3 => Some(1004),
            // Active power per phase
            JanitzaVar::P1 => Some(1036),
            JanitzaVar::P2 => Some(1038),
            JanitzaVar::P3 => Some(1040),
            // Frequency
            JanitzaVar::F => Some(1088),
            // Total harmonic distortion (address to be confirmed via scan)
            JanitzaVar::Thd1 => Some(1090),
            JanitzaVar::Thd2 => Some(1092),
            JanitzaVar::Thd3 => Some(1094),
            // Power factor (cos φ) per phase — to be confirmed via scan
            JanitzaVar::Fp1 => Some(1072),
            JanitzaVar::Fp2 => Some(1074),
            JanitzaVar::Fp3 => Some(1076),
            // Energy not available on UMG503
            JanitzaVar::E1 | JanitzaVar::E2 | JanitzaVar::E3 => None,
        }
    }

    /// Get the measurement unit
    pub fn unidad(&self) -> &'static str {
        match self {
            JanitzaVar::V1 | JanitzaVar::V2 | JanitzaVar::V3 => "V",
            JanitzaVar::C1 | JanitzaVar::C2 | JanitzaVar::C3 => "A",
            JanitzaVar::P1 | JanitzaVar::P2 | JanitzaVar::P3 => "W",
            JanitzaVar::F => "Hz",
            JanitzaVar::E1 | JanitzaVar::E2 | JanitzaVar::E3 => "Wh",
            JanitzaVar::Fp1 | JanitzaVar::Fp2 | JanitzaVar::Fp3 => "",
            JanitzaVar::Thd1 | JanitzaVar::Thd2 | JanitzaVar::Thd3 => "",
        }
    }

    /// Parse from string identifier (as stored in esquemas.json canales_janitzas)
    pub fn from_str(s: &str) -> Option<Self> {
        match s.to_lowercase().as_str() {
            "v1" => Some(JanitzaVar::V1),
            "v2" => Some(JanitzaVar::V2),
            "v3" => Some(JanitzaVar::V3),
            "c1" => Some(JanitzaVar::C1),
            "c2" => Some(JanitzaVar::C2),
            "c3" => Some(JanitzaVar::C3),
            "p1" => Some(JanitzaVar::P1),
            "p2" => Some(JanitzaVar::P2),
            "p3" => Some(JanitzaVar::P3),
            "f"  => Some(JanitzaVar::F),
            "e1" => Some(JanitzaVar::E1),
            "e2" => Some(JanitzaVar::E2),
            "e3" => Some(JanitzaVar::E3),
            "fp1" => Some(JanitzaVar::Fp1),
            "fp2" => Some(JanitzaVar::Fp2),
            "fp3" => Some(JanitzaVar::Fp3),
            "thd1" => Some(JanitzaVar::Thd1),
            "thd2" => Some(JanitzaVar::Thd2),
            "thd3" => Some(JanitzaVar::Thd3),
            _ => None,
        }
    }
}

/// Convert two uint16 Modbus registers to f32 (IEEE 754 big-endian,
/// word-high-first). Byte order on the wire: [r0_hi, r0_lo, r1_hi, r1_lo].
/// Used by the UMG509.
pub fn registros_a_float(high: u16, low: u16) -> f32 {
    let bytes: [u8; 4] = [
        (high >> 8) as u8,
        (high & 0xFF) as u8,
        (low >> 8) as u8,
        (low & 0xFF) as u8,
    ];
    f32::from_be_bytes(bytes)
}

/// Convert two uint16 Modbus registers to f32 with fully reversed byte order.
/// The UMG503 transmits the 4 bytes in reverse (little-endian byte + word swap):
/// wire order [r0_hi, r0_lo, r1_hi, r1_lo] must be read as [r1_lo, r1_hi, r0_lo, r0_hi].
pub fn registros_a_float_reverse(r0: u16, r1: u16) -> f32 {
    let bytes: [u8; 4] = [
        (r0 >> 8) as u8,
        (r0 & 0xFF) as u8,
        (r1 >> 8) as u8,
        (r1 & 0xFF) as u8,
    ];
    // Reverse all 4 bytes
    let reversed = [bytes[3], bytes[2], bytes[1], bytes[0]];
    f32::from_be_bytes(reversed)
}

/// Read selected Janitza variables with retry logic, using the register map
/// of the given model. Returns Vec<Option<f64>> where None = NULL (instrument
/// did not respond, or variable not available on this model).
pub async fn leer_janitza(
    client: &mut ModbusTcpClient,
    slave_id: u8,
    variables: &[JanitzaVar],
    reintentos: u8,
    timeout_ms: u64,
    modelo: ModeloJanitza,
) -> Vec<Option<f64>> {
    let mut resultados = Vec::with_capacity(variables.len());

    for variable in variables {
        // Variable may not exist on this model (e.g. energy on UMG503)
        let addr = match variable.registro_inicio(modelo) {
            Some(a) => a,
            None => {
                resultados.push(None);
                continue;
            }
        };

        let mut valor: Option<f64> = None;

        for _intento in 0..=reintentos {
            match client.leer_holding_registers_slave(slave_id, addr, 2, timeout_ms).await {
                Ok(regs) if regs.len() == 2 => {
                    let float_val = match modelo {
                        ModeloJanitza::Umg503 => registros_a_float_reverse(regs[0], regs[1]),
                        ModeloJanitza::Umg509 => registros_a_float(regs[0], regs[1]),
                    };
                    valor = Some(float_val as f64);
                    break;
                }
                _ => {
                    sleep(Duration::from_millis(100)).await;
                }
            }
        }

        resultados.push(valor);
    }

    resultados
}
