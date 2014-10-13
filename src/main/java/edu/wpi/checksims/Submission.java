package edu.wpi.checksims;

import edu.wpi.checksims.util.Token;
import edu.wpi.checksims.util.TokenListCloner;

import java.io.File;
import java.io.IOException;
import java.nio.file.FileSystems;
import java.nio.file.PathMatcher;
import java.nio.file.Paths;
import java.util.Collections;
import java.util.LinkedList;
import java.util.List;

public class Submission<T extends Comparable> {
    private final List<Token<T>> tokenList;
    private final String name;

    public Submission(String name, List<Token<T>> tokens) {
        this.name = name;
        this.tokenList = tokens;
    }

    public List<Token<T>> getTokenList() {
        return TokenListCloner.cloneList(tokenList);
    }

    public String getName() {
        return name;
    }

    public int getNumTokens() {
        return tokenList.size();
    }

    @Override
    public String toString() {
        return "A submission with name " + name + " and " + getNumTokens() + " tokens";
    }

    // TODO should compare token lists as well
    @Override
    public boolean equals(Object other) {
        if(!(other instanceof Submission)) {
            return false;
        }

        Submission<T> otherSubmission = (Submission<T>)other;

        return otherSubmission.getName().equals(this.name) && otherSubmission.getNumTokens() == this.getNumTokens();
    }

    // TODO once we have a proper equals and HashCode convert this to return Set<Submission>
    public static <T2 extends Comparable> List<Submission<T2>> submissionsFromDir(File directory, String glob, FileSplitter<T2> splitter) throws IOException {
        List<Submission<T2>> submissions = new LinkedList<>();

        if(!directory.exists() || !directory.isDirectory()) {
            throw new IOException("Directory " + directory.getName() + " does not exist or is not a directory!");
        }

        File[] contents = directory.listFiles();

        // Iterate through directory contents looking for subdirectories
        // and call submissionFromDir() on them
        for(File f : contents) {
            if(f.exists() && f.isDirectory()) {
                Submission<T2> s = submissionFromDir(f, glob, splitter);

                if(s != null) {
                    submissions.add(s);
                }
            }
        }

        return submissions;
    }

    public static <T2 extends Comparable> Submission<T2> submissionFromDir(File directory, String glob, FileSplitter<T2> splitter) throws IOException {
        List<File> files = new LinkedList<>();
        String dirName = directory.getName();

        if(!directory.exists() || !directory.isDirectory()) {
            throw new IOException("Directory " + dirName + " does not exist or is not a directory!");
        }

        PathMatcher matcher = FileSystems.getDefault().getPathMatcher("glob:" + glob);

        File[] contents = directory.listFiles();

        // TODO should have verbose logging option to note which files are being matched and included
        for(File f : contents) {
            if(matcher.matches(Paths.get(f.getAbsolutePath()).getFileName())) {
                files.add(f);
            }
        }

        return submissionFromFiles(dirName, files, splitter);
    }

    public static <T2 extends Comparable> Submission<T2> submissionFromFiles(String name, List<File> files, FileSplitter<T2> splitter) throws IOException {
        if(files.size() == 0) {
            return null;
        }

        List<Token<T2>> tokenList = new LinkedList<>();

        for(File f : files) {
            tokenList.addAll(splitter.splitFile(FileLineReader.readFile(f)));
        }

        return new Submission<>(name, tokenList);
    }
}
