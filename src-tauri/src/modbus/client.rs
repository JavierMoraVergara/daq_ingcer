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

    /// Test connection by attempting to read register 0
    pub async fn probar_conexion(
        ip: &str,
        puerto: u16,
        slave_id: u8,
        timeout_ms: u64,
    ) -> bool {
        match Self::conectar(ip, puerto, slave_id, timeout_ms).await {
            Ok(mut client) => {
                client.leer_holding_registers(0, 1, timeout_ms).await.is_ok()
            }
            Err(_) => false,
        }
    }
}
