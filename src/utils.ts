export const connectTwoArrays = <T extends Record<string, any>>(
  array1: T[],
  array2: T[],
  idKey: keyof T
): T[] => {
  const map = new Map(array1.map((item) => [item[idKey], item]));

  for (const item of array2) {
    if (!map.has(item[idKey])) {
      map.set(item[idKey], item);
    }
  }

  return Array.from(map.values());
};

export const createPeerConnection = () => {
  const pc = new RTCPeerConnection({
    iceServers: [{ urls: "stun:stun.l.google.com:19302" }],
  });

  return pc;
};
