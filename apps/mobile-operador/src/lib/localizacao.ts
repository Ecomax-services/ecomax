import * as Location from 'expo-location';

export interface Coordenada { lat: number; lng: number; }

/**
 * Coordenada do aparelho para carimbar check-in e check-out.
 *
 * Nunca lança e nunca trava: devolve `null` quando a pessoa nega a permissão,
 * quando o GPS está desligado ou quando não há sinal a tempo. Check-in é registro
 * de trabalho — se o operador entrou num subsolo sem sinal, o registro tem que
 * acontecer do mesmo jeito, sem coordenada, e não virar um bloqueio no meio do
 * serviço.
 *
 * O `Promise.race` existe porque `getCurrentPositionAsync` pode ficar minutos
 * procurando satélite em local fechado. Preferimos registrar sem coordenada a
 * deixar a tela girando.
 */
const LIMITE_MS = 8000;

export async function coordenadaAtual(): Promise<Coordenada | null> {
  try {
    const { status } = await Location.requestForegroundPermissionsAsync();
    if (status !== 'granted') return null;

    const pos = await Promise.race([
      Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced }),
      new Promise<null>((resolve) => setTimeout(() => resolve(null), LIMITE_MS)),
    ]);
    if (!pos) return null;

    return { lat: pos.coords.latitude, lng: pos.coords.longitude };
  } catch {
    return null;
  }
}
