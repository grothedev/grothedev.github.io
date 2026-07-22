#!/usr/bin/python3

import argparse
import sys

#this is a template for a python program that can be run from command line or used as a module

def parseArgs():
    parser = argparse.ArgumentParser(description='the program does a thing')
    parser.add_argument('-v', '--verbose', action='store_true', help='verbose')
    parser.add_argument('-i', '--input', type=str, required=True, help='input file')
    parser.add_argument('-o', '--output', type=str, required=False, help='output file')
    args = parser.parse_args()
    return args

def main():
    args = parseArgs()
    if args.verbose:
        print(f"Input file: {args.input}")
        if args.output:
            print(f"Output file: {args.output}")
    



if __name__ == '__main__':
    main()