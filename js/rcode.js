// rcode.js
// Produces copy-pasteable R code that reproduces the current sticker with
// hexSticker::sticker(). All key arguments are emitted (not just diffs from
// the defaults) so the snippet is self-explanatory on its own.

function rString(value) {
  const escaped = String(value).replace(/\\/g, '\\\\').replace(/"/g, '\\"');
  return `"${escaped}"`;
}

function rBool(value) {
  return value ? 'TRUE' : 'FALSE';
}

function rNumber(value) {
  return Number.isInteger(value) ? String(value) : String(value);
}

function fileSafeName(pkg) {
  const trimmed = (pkg || 'mypackage').trim();
  return trimmed.length ? trimmed.replace(/[^A-Za-z0-9_.-]/g, '_') : 'mypackage';
}

export function toRCode(state) {
  const subplotArg = state.subplotImage
    ? 'subplot_image' // see comment above the call
    : `${rString('path/to/your/image.png')}`;

  const lines = [];
  lines.push('library(hexSticker)');
  lines.push('');
  if (state.subplotImage) {
    lines.push('# Uploaded image used as `subplot` in the app -- save it locally and');
    lines.push('# point R at that file (or read it with magick::image_read()).');
    lines.push(`subplot_image <- ${rString('path/to/your/image.png')}`);
    lines.push('');
  }
  lines.push('sticker(');
  lines.push(`  subplot = ${subplotArg},`);
  lines.push(`  s_x = ${rNumber(state.s_x)},`);
  lines.push(`  s_y = ${rNumber(state.s_y)},`);
  lines.push(`  s_width = ${rNumber(state.s_width)},`);
  lines.push(`  s_height = ${rNumber(state.s_height)},`);
  lines.push('');
  lines.push(`  package = ${rString(state.package)},`);
  lines.push(`  p_x = ${rNumber(state.p_x)},`);
  lines.push(`  p_y = ${rNumber(state.p_y)},`);
  lines.push(`  p_size = ${rNumber(state.p_size)},`);
  lines.push(`  p_color = ${rString(state.p_color)},`);
  lines.push(`  p_family = ${rString(state.p_family)},`);
  lines.push(`  p_fontface = ${rString(state.p_fontface)},`);
  lines.push('');
  lines.push(`  h_size = ${rNumber(state.h_size)},`);
  lines.push(`  h_fill = ${rString(state.h_fill)},`);
  lines.push(`  h_color = ${rString(state.h_color)},`);
  lines.push('');
  lines.push(`  spotlight = ${rBool(state.spotlight)},`);
  lines.push(`  l_x = ${rNumber(state.l_x)},`);
  lines.push(`  l_y = ${rNumber(state.l_y)},`);
  lines.push(`  l_alpha = ${rNumber(state.l_alpha)},`);
  lines.push('');
  lines.push(`  url = ${rString(state.url)},`);
  lines.push(`  u_x = ${rNumber(state.u_x)},`);
  lines.push(`  u_y = ${rNumber(state.u_y)},`);
  lines.push(`  u_size = ${rNumber(state.u_size)},`);
  lines.push(`  u_color = ${rString(state.u_color)},`);
  lines.push(`  u_family = ${rString(state.u_family)},`);
  lines.push(`  u_angle = ${rNumber(state.u_angle)},`);
  lines.push('');
  lines.push(`  white_around_sticker = ${rBool(state.white_around_sticker)},`);
  lines.push('');
  lines.push(`  filename = ${rString(`${fileSafeName(state.package)}.png`)},`);
  lines.push('  dpi = 300');
  lines.push(')');

  return lines.join('\n');
}
