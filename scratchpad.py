import re

file_path = r'd:\Code_DoAn\optiroute-ai\app\itinerary\page.tsx'
with open(file_path, 'r', encoding='utf-8') as f:
    content = f.read()

pattern = re.compile(
    r'[ \t]*// ── Drag & Drop: reorder activities within a session ──\n'
    r'[ \t]*const handleDragEnd = \(event: DragEndEvent, session: "morning" \| "afternoon" \| "evening"\) => \{\n'
    r'[ \t]*const \{ active, over \} = event;\n'
    r'[ \t]*setIsDragging\(false\);\n'
    r'[ \t]*if \(\!over \|\| active\.id === over\.id \|\| \!itineraryResult\) return;\n\n'
    r'[ \t]*const day = itineraryResult\[activeDayIdx\];\n'
    r'[ \t]*if \(\!day\?\.sessions\) return;\n\n'
    r'[ \t]*const items = \[\.\.\.\(day\.sessions\[session\] \|\| \[\]\)\];\n'
    r'[ \t]*const oldIdx = items\.findIndex\(\(\_, i\) => `\$\{session\}-\$\{i\}` === active\.id\);\n'
    r'[ \t]*const newIdx = items\.findIndex\(\(\_, i\) => `\$\{session\}-\$\{i\}` === over\.id\);\n'
    r'[ \t]*if \(oldIdx === -1 \|\| newIdx === -1\) return;\n\n'
    r'[ \t]*const reordered = arrayMove\(items, oldIdx, newIdx\);\n'
    r'[ \t]*const updated = itineraryResult\.map\(\(d, di\) => \{\n'
    r'[ \t]*if \(di !== activeDayIdx \|\| \!d\.sessions\) return d;\n'
    r'[ \t]*return \{ \.\.\.d, sessions: \{ \.\.\.d\.sessions, \[session\]: reordered \} \};\n'
    r'[ \t]*\}\);\n'
    r'[ \t]*setItineraryResult\(updated\);\n'
    r'[ \t]*showJourneyNotif\(lang === "vi" \? "✅ Đã sắp xếp lại lịch trình!" : "✅ Itinerary reordered!"\);\n'
    r'[ \t]*\};\n\n'
    r'([ \t]*)return \(',
    re.MULTILINE
)

matches = re.findall(pattern, content)
print(f"Found {len(matches)} matches.")

cleaned_content = pattern.sub(r'\g<1>return (', content)

with open(file_path, 'w', encoding='utf-8') as f:
    f.write(cleaned_content)
