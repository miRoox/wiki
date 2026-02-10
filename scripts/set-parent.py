#!/usr/bin/env python3
# -*- coding: utf-8 -*-

from pathlib import Path


EXCLUDED_TAGS = {
	"分类",
	"TODO",
	"时效限制条目",
	"可缩放矢量图形",
	"JPEG图像",
	"便携式网络图形",
}

TIDDLERS_DIR = Path(__file__).resolve().parent.parent / "tiddlers"


def parse_tags(raw: str) -> list[tuple[str, str]]:
	"""Parse tags into (name, raw_form) pairs, keeping brackets when present."""

	tags: list[tuple[str, str]] = []
	i = 0
	length = len(raw)

	while i < length:
		if raw[i].isspace():
			i += 1
			continue

		if raw.startswith("[[", i):
			end = raw.find("]]", i + 2)
			if end == -1:
				name = raw[i + 2 :].strip()
				raw_form = f"[[{raw[i + 2 :]}"
				tags.append((name, raw_form))
				break
			name = raw[i + 2 : end]
			raw_form = raw[i : end + 2]
			tags.append((name, raw_form))
			i = end + 2
		else:
			j = i
			while j < length and not raw[j].isspace():
				j += 1
			name = raw[i:j]
			raw_form = name
			tags.append((name, raw_form))
			i = j

	return [(name, raw_form) for name, raw_form in tags if name]


def load_header(lines: list[str]) -> tuple[list[str], list[str], dict[str, str]]:
	"""Split lines into header and body and parse header fields."""

	header_end = None
	for idx, line in enumerate(lines):
		if not line.strip():
			header_end = idx
			break

	if header_end is None:
		header_end = len(lines)

	header_lines = lines[:header_end]
	body_lines = lines[header_end:]

	fields: dict[str, str] = {}
	for line in header_lines:
		if ":" not in line:
			continue
		key, value = line.split(":", 1)
		fields[key.strip()] = value.lstrip()

	return header_lines, body_lines, fields


def choose_parent(tags: list[tuple[str, str]]) -> str | None:
	for name, raw in tags:
		if name.startswith("$:/"):
			continue
		if name in EXCLUDED_TAGS:
			continue
		return raw
	return None


def update_file(path: Path) -> bool:
	text = path.read_text(encoding="utf-8")
	lines = text.splitlines()
	ends_with_newline = text.endswith("\n")

	header_lines, body_lines, fields = load_header(lines)

	title = fields.get("title")
	if not title or title.startswith("$:/"):
		return False

	if "parent" in fields:
		return False

	tags_raw = fields.get("tags", "").strip()
	if not tags_raw:
		return False

	tags = parse_tags(tags_raw)
	parent = choose_parent(tags)
	if not parent:
		return False

	new_header: list[str] = []
	inserted = False
	for line in header_lines:
		if not inserted and ":" in line:
			key = line.split(":", 1)[0].strip()
			if key == "tags":
				new_header.append(f"parent: {parent}")
				inserted = True
		new_header.append(line)

	if not inserted:
		new_header.append(f"parent: {parent}")

	new_lines = new_header + body_lines
	new_text = "\n".join(new_lines)
	if ends_with_newline and not new_text.endswith("\n"):
		new_text += "\n"

	if new_text == text:
		return False

	path.write_text(new_text, encoding="utf-8")
	return True


def main() -> None:
	updated = 0

	for path in sorted(TIDDLERS_DIR.iterdir()):
		if not path.is_file():
			continue
		if path.suffix not in {".tid", ".meta"}:
			continue
		if update_file(path):
			updated += 1
			print(f"Set parent for {path.name}")

	print(f"Done. Updated {updated} tiddler(s).")


if __name__ == "__main__":
	main()
