// Photo Sphere XMP helpers. Street View needs GPano metadata in the JPEG.
// Insta360 exports usually include it; this adds it when missing.
(function () {
  const XMP_HEADER = "http://ns.adobe.com/xap/1.0/\0";

  // True when the JPEG already declares an equirectangular projection.
  function hasGPano(bytes) {
    const head = new TextDecoder("latin1").decode(bytes.subarray(0, Math.min(bytes.length, 512 * 1024)));
    // Matches attribute form (ProjectionType="equirectangular") and element form (<GPano:ProjectionType>equirectangular).
    return /ProjectionType\s*(=\s*["']|>)\s*equirectangular/i.test(head);
  }

  function buildXmp(width, height, heading) {
    const headingAttr = Number.isFinite(heading) ? ` GPano:PoseHeadingDegrees="${heading}"` : "";
    return '<?xpacket begin="﻿" id="W5M0MpCehiHzreSzNTczkc9d"?>'
      + '<x:xmpmeta xmlns:x="adobe:ns:meta/">'
      + '<rdf:RDF xmlns:rdf="http://www.w3.org/1999/02/22-rdf-syntax-ns#">'
      + '<rdf:Description rdf:about="" xmlns:GPano="http://ns.google.com/photos/1.0/panorama/"'
      + ' GPano:ProjectionType="equirectangular"'
      + ' GPano:UsePanoramaViewer="True"'
      + ` GPano:FullPanoWidthPixels="${width}"`
      + ` GPano:FullPanoHeightPixels="${height}"`
      + ` GPano:CroppedAreaImageWidthPixels="${width}"`
      + ` GPano:CroppedAreaImageHeightPixels="${height}"`
      + ' GPano:CroppedAreaLeftPixels="0"'
      + ' GPano:CroppedAreaTopPixels="0"'
      + headingAttr
      + '/></rdf:RDF></x:xmpmeta><?xpacket end="w"?>';
  }

  // Returns a new Uint8Array with an XMP APP1 segment placed after SOI and any APP0/EXIF segments.
  function injectGPano(bytes, width, height, heading) {
    if (bytes[0] !== 0xff || bytes[1] !== 0xd8) throw new Error("Not a JPEG file");

    const enc = new TextEncoder();
    const payload = enc.encode(XMP_HEADER + buildXmp(width, height, heading));
    const segLen = payload.length + 2;
    if (segLen > 0xffff) throw new Error("XMP segment too large");

    // Walk leading APP0/APP1 segments so EXIF stays first.
    let pos = 2;
    while (pos + 4 <= bytes.length && bytes[pos] === 0xff && (bytes[pos + 1] === 0xe0 || bytes[pos + 1] === 0xe1)) {
      const len = (bytes[pos + 2] << 8) | bytes[pos + 3];
      pos += 2 + len;
    }

    const out = new Uint8Array(bytes.length + 4 + payload.length);
    out.set(bytes.subarray(0, pos), 0);
    out[pos] = 0xff;
    out[pos + 1] = 0xe1;
    out[pos + 2] = (segLen >> 8) & 0xff;
    out[pos + 3] = segLen & 0xff;
    out.set(payload, pos + 4);
    out.set(bytes.subarray(pos), pos + 4 + payload.length);
    return out;
  }

  window.SphereXmp = { hasGPano, injectGPano };
})();
