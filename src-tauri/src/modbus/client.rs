use std::net::SocketAddr;
use std::time::Duration;
use tokio::time::timeout;
use tokio_modbus::client::tcp;
use tokio_modbus::prelude::*;

pub struct ModbusTcpClient {
    ctx: tokio_modbus::client::Context,
}

impl ModbusTcpClient {
    /// Connect to a Modbus TCP device (gateway or direct).
    /// The slave_id is set initially but can be changed per-read with `set_slave`.
    pub async fn conectar(
        ip: &str,
        puerto: u16,
        slave_id: u8,
        timeout_ms: u64,
    ) -> Result<Self, String> {
        let addr: SocketAddr = format!("{}:{}", ip, puerto)
            .parse()
            .map_err(|e| format!("Dirección IP inválida: {}", e))?;

        let slave = Slave(slave_id);

        let ctx = timeout(
            Duration::from_millis(timeout_ms),
            tcp::connect_slave(addr, slave),
        )
        .await
        .map_err(|_| format!("Timeout conectando a {}:{}", ip, puerto))?
        .map_err(|e| format!("Error conectando Modbus TCP a {}:{}: {}", ip, puerto, e))?;

        Ok(Self { ctx })
    }

    /// Change the slave ID for subsequent reads (useful for gateways like MGate)
    pub fn set_slave(&mut self, slave_id: u8) {
        self.ctx.set_slave(Slave(slave_id));
    }

    /// Read holding registers with timeout
    pub async fn leer_holding_registers(
        &mut self,
        addr: u16,
        count: u16,
        timeout_ms: u64,
    ) -> Result<Vec<u16>, String> {
        let response = timeout(
            Duration::from_millis(timeout_ms),
            self.ctx.read_holding_registers(addr, count),
        )
        .await
        .map_err(|_| format!("Timeout leyendo registros en dirección {}", addr))?
        .map_err(|e| format!("Error de transporte leyendo dirección {}: {}", addr, e))?;

        response.map_err(|e| format!("Excepción Modbus en dirección {}: {:?}", addr, e))
    }

    /// Read holding registers with a specific slave ID (changes slave, reads, returns result)
    pub async fn leer_holding_registers_slave(
        &mut self,
        slave_id: u8,
        addr: u16,
        count: u16,
        timeout_ms: u64,
    ) -> Result<Vec<u16>, String> {
        self.set_slave(slave_id);
        self.leer_holding_registers(addr, count, timeout_ms).await
    }

    /// Write a single holding register (Modbus function 06) with timeout.
    /// Used to change the Set Value (SV) of the Metaltex MC62 controller.
    pub async fn escribir_single_register(
        &mut self,
        addr: u16,
        valor: u16,
        timeout_ms: u64,
    ) -> Result<(), String> {
        timeout(
            Duration::from_millis(timeout_ms),
            self.ctx.write_single_register(addr, valor),
        )
        .await
        .map_err(|_| format!("Timeout escribiendo registro {}", addr))?
        .map_err(|e| format!("Error de transporte escribiendo registro {}: {}", addr, e))?
        .map_err(|e| format!("Excepción Modbus escribiendo registro {}: {:?}", addr, e))
    }

    /// Write a single holding register with a specific slave ID.
    pub async fn escribir_single_register_slave(
        &mut self,
        slave_id: u8,
        addr: u16,
        valor: u16,
        timeout_ms: u64,
    ) -> Result<(), String> {
        self.set_slave(slave_id);
        self.escribir_single_register(addr, valor, timeout_ms).await
    }

    /// Test connection: first checks TCP reach to gateway, then tries to read
    /// `registro_prueba` from the slave. Returns (gateway_ok, esclavo_ok).
    ///
    /// The register to probe depends on the instrument: most use register 0,
    /// but the UMG503 has no register 0 (its map starts at 3004+), so a valid
    /// register such as 3006 (V1) must be used to get a meaningful result.
    pub async fn probar_conexion(
        ip: &str,
        puerto: u16,
        slave_id: u8,
        timeout_ms: u64,
        registro_prueba: u16,
    ) -> (bool, bool) {
        match Self::conectar(ip, puerto, slave_id, timeout_ms).await {
            Ok(mut client) => {
                let esclavo_ok = client
                    .leer_holding_registers(registro_prueba, 1, timeout_ms)
                    .await
                    .is_ok();
                (true, esclavo_ok)
            }
            Err(_) => (false, false),
        }
    }
}
