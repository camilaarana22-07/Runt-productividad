# Respaldo y uso en la oficina (red local)

## 1. Respaldo de la base de datos

Todo el histórico (usuarios, tickets, jornadas) vive en un solo archivo:
`backend\data\runt.db`. Si se daña o se borra, se pierde todo. Por eso conviene copiarlo seguido.

**Cómo hacer una copia:** doble clic en **`Respaldar base de datos.bat`**.
Crea una copia con la fecha y la hora dentro de la carpeta **`Respaldos RUNT`**.

Recomendación: una o dos veces por semana, además del doble clic, arrastre una copia
de la carpeta `Respaldos RUNT` a un USB o a la nube (OneDrive, Google Drive). Si el
computador falla, el histórico queda a salvo en otro lugar.

No hace falta apagar el sistema para respaldar; puede hacerlo con todo encendido.

## 2. Uso en la oficina (varios operadores en la misma red)

La idea: este computador queda como "servidor" y los demás entran desde su navegador.

### Preparación (una sola vez)

1. **Firewall.** La primera vez que inicie en modo oficina, Windows preguntará si permite
   el acceso de Node.js a la red. Marque **Redes privadas** y **Permitir acceso**.
   Si no apareció, hay que abrir el puerto 3000: pídale a alguien de sistemas que
   permita el puerto 3000 (TCP) en el Firewall de Windows para redes privadas.

2. **IP fija recomendada.** Conviene que este computador tenga siempre la misma dirección
   IP en la red, para que la dirección no cambie. Eso lo configura sistemas en el router
   o en Windows. No es obligatorio para probar, pero sí para el uso diario.

### Cada día

1. Doble clic en **`Iniciar RUNT (oficina).bat`**.
2. La ventana muestra la dirección para los operadores, algo como
   `http://192.168.1.50:3000`. Anótela.
3. **Deje esa ventana abierta** mientras usen el sistema. Este computador debe permanecer
   encendido.

### Los operadores

Desde su propio computador, en el navegador (Chrome o Edge), escriben la dirección que le
salió a usted (por ejemplo `http://192.168.1.50:3000`) e ingresan con su correo y contraseña.

> Nota: ya no usan `localhost:5173`. Esa dirección solo funciona en el computador servidor.
> Los operadores usan siempre `http://LA-IP:3000`.

### Si un operador no puede entrar

- Verifique que su computador esté en la **misma red** (mismo wifi o cableado de la oficina).
- Confirme la dirección: debe ser la IP del servidor y terminar en `:3000`.
- Revise el firewall del servidor (punto 1 de la preparación).

## 3. Acceso desde fuera de la oficina (casa, otras sedes)

Esto es un paso mayor: exponer el sistema a internet requiere un servidor con dirección
pública, HTTPS y medidas de seguridad, porque se manejan datos de personas. **No conviene
improvisarlo.** Cuando llegue ese momento, involucre a alguien de sistemas de la entidad;
las opciones habituales son contratar un servidor en la nube o una VPN de la organización.

## 4. Modo desarrollo (como veníamos trabajando)

Para hacer pruebas o cambios sigue sirviendo el modo de dos ventanas:
- `backend`: `npm run dev`  →  http://localhost:3000
- `frontend`: `npm run dev` →  http://localhost:5173

El modo oficina (`Iniciar RUNT (oficina).bat`) es para el uso real con varios operadores.
