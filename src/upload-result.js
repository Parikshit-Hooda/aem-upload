/*************************************************************************
* ADOBE CONFIDENTIAL
* ___________________
*
* Copyright 2019 Adobe
* All Rights Reserved.
*
* NOTICE: All information contained herein is, and remains
* the property of Adobe and its suppliers, if any. The intellectual
* and technical concepts contained herein are proprietary to Adobe
* and its suppliers and are protected by all applicable intellectual
* property laws, including trade secret and copyright laws.
* Dissemination of this information or reproduction of this material
* is strictly forbidden unless prior written permission is obtained
* from Adobe.
**************************************************************************/

import { getAverage } from './utils';

/**
 * Retrieves a list of all file results that were successful.
 *
 * @param {Array} fileResults List of FileUploadResult instance to analyze.
 * @returns {Array} Contains only those FileUploadResult instance from fileResults that were successful.
 */
function getSuccessfulFileResults(fileResults) {
    const success = [];
    fileResults.forEach(result => {
        if (result.isSuccessful()) {
            success.push(result);
        }
    });
    return success;
}

/**
 * Represents results for the upload process as a whole, which might include multiple files. Results
 * include information such as total upload time, total file size, total number of files, etc.
 */
export default class UploadResult {
    /**
     * Constructs a new instance of the results, which can be used to add more information.
     */
    constructor() {
        this.initTime = 0;
        this.totalTime = 0;
        this.fileUploadResults = [];
    }

    /**
     * Starts a timer that will be used to calculate the total amount of time it takes for the upload
     * process to complete.
     */
    startTimer() {
        this.start = new Date().getTime();
    }

    /**
     * Stops the timer and calculates the amount of time elapsed since startTimer() was called.
     */
    stopTimer() {
        if (this.start) {
            this.totalTime = new Date().getTime() - this.start;
        }
    }

    /**
     * Adds new individual file results to the overall result. Will be used to calculate various overall metrics.
     *
     * @param {FileUploadResult} fileUploadResult Result whose metrics will be included in the overall result.
     */
    addFileUploadResult(fileUploadResult) {
        this.fileUploadResults.push(fileUploadResult);
    }

    /**
     * Sets the amount of time, in milliseconds, that it took for the upload process's initiate upload request
     * to complete.
     *
     * @param {number} elapsedTime Time span in milliseconds.
     */
    setInitTime(elapsedTime) {
        this.initTime = elapsedTime;
    }

    /**
     * Retrieves the amount of time, in milliseconds, that it took the direct binary upload initiate request
     * to complete.
     *
     * @returns {number} Time span in milliseconds.
     */
    getInitTime() {
        return this.initTime;
    }

    /**
     * Sets the total number of files that are initially included in the overall upload.
     *
     * @param {number} totalFiles Number of files.
     */
    setTotalFiles(totalFiles) {
        this.totalFiles = totalFiles;
    }

    /**
     * Retrieves the total number of files initially included in the overall upload.
     *
     * @returns {number} Number of files.
     */
    getTotalFiles() {
        return this.totalFiles;
    }

    /**
     * Retrieves the number of files that uploaded successfully.
     *
     * @returns {number} Number of files.
     */
    getTotalCompletedFiles() {
        return getSuccessfulFileResults(this.fileUploadResults).length;
    }

    /**
     * Retrieves the total amount of time, in milliseconds, that elapsed between calls to startTimer() and stopTimer().
     *
     * @returns {number} Time span in milliseconds.
     */
    getElapsedTime() {
        return this.totalTime;
    }

    /**
     * Retrieves the total size, in bytes, of all files initially provided to the upload process.
     *
     * @returns {number} Size in bytes.
     */
    getTotalSize() {
        let size = 0;
        this.fileUploadResults.forEach(result => {
            size += result.getFileSize();
        });
        return size;
    }

    /**
     * Retrieves the average size, in bytes, of all files initially provided to the upload process.
     *
     * @returns {number} Size in bytes.
     */
    getAverageFileSize() {
        return getAverage(this.fileUploadResults.map(result => result.getFileSize()));
    }

    /**
     * Retrieves the average amount of time, in milliseconds, it took for all files that were
     * uploaded successfully to fully transfer.
     *
     * @returns {number} Time span in milliseconds.
     */
    getAverageFileUploadTime() {
        return getAverage(getSuccessfulFileResults(this.fileUploadResults)
            .map(result => result.getTotalUploadTime()));
    }

    /**
     * Retrieves the average amount of time, in milliseconds, it took for individual file parts
     * to fully transfer.
     *
     * @returns {number} Time span in milliseconds.
     */
    getAveragePartUploadTime() {
        return getAverage(getSuccessfulFileResults(this.fileUploadResults)
            .map(result => result.getAveragePartUploadTime()));
    }

    /**
     * Retrieves the average amount of time, in milliseconds, it took for the direct binary
     * access complete request to finish.
     *
     * @returns {number} Time span in milliseconds.
     */
    getAverageCompleteTime() {
        return getAverage(getSuccessfulFileResults(this.fileUploadResults)
            .map(result => result.getTotalCompleteTime()));
    }

    /**
     * Retrieves the total time to upload that was in the 90th percentile for the upload process.
     *
     * @returns {number} Time span in milliseconds.
     */
    getNinetyPercentileTotal() {
        const totalSpentArr = getSuccessfulFileResults(this.fileUploadResults)
            .map(result => {
                return result.getTotalUploadTime() + result.getTotalCompleteTime();
            });
        const sortedTotalSpentArr = totalSpentArr.sort((x, y) => x - y);
        const nintyPercentileIndex = Math.round(this.getTotalCompletedFiles() * 0.9) - 1;
        return sortedTotalSpentArr[nintyPercentileIndex];

    }

    /**
     * Retrieves all the individual file upload results contained in the overall result.
     *
     * @returns {Array} List of FileUploadResult instances.
     */
    getFileUploadResults() {
        return this.fileUploadResults;
    }

    /**
     * Retrieves all the errors that occurred in the transfer process.
     *
     * @returns {Array} List of UploadError instances.
     */
    getErrors() {
        const errors = [];

        this.getFileUploadResults().forEach(result => {
            result.getErrors().forEach(error => {
                errors.push(error);
            });
        });

        return errors;
    }

    /**
     * Converts the result instance into a simple object containing all result data.
     *
     * @returns {object} Result data in a simple format.
     */
    toJSON() {
        return {
            initSpend: this.getInitTime(),
            totalFiles: this.getTotalFiles(),
            totalTime: this.getElapsedTime(),
            totalCompleted: this.getTotalCompletedFiles(),
            finalSpent: this.getElapsedTime(),
            totalFileSize: this.getTotalSize(),
            avgFileSize: this.getAverageFileSize(),
            avgPutSpent: this.getAveragePartUploadTime(),
            avgCompleteSpent: this.getAverageCompleteTime(),
            nintyPercentileTotal: this.getNinetyPercentileTotal(),
            detailedResult: this.fileUploadResults.map(result => result.toJSON()),
        };
    }
}
