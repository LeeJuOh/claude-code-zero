Our CSV importer chokes on the files one of our partners sends, because they use
semicolons instead of commas. On top of that, when a row has too few columns the
error is just "index out of range", which nobody can act on. Make the importer
work out the delimiter from the file itself, and make the row error name the file
and the line number it failed on.
