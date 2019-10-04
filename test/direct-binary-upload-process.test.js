/*
Copyright 2019 Adobe. All rights reserved.
This file is licensed to you under the Apache License, Version 2.0 (the "License");
you may not use this file except in compliance with the License. You may obtain a copy
of the License at http://www.apache.org/licenses/LICENSE-2.0

Unless required by applicable law or agreed to in writing, software distributed under
the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR REPRESENTATIONS
OF ANY KIND, either express or implied. See the License for the specific language
governing permissions and limitations under the License.
*/

const should = require('should');
const querystring = require('querystring');

const { importFile } = require('./testutils');
const MockRequest = require('./mock-request');
const MockBlob = require('./mock-blob');

const DirectBinaryUploadProcess = importFile('direct-binary-upload-process');

const DirectBinaryUploadOptions = importFile('direct-binary-upload-options');

describe('DirectBinaryUploadProcessTest', () => {
    beforeEach(() => {
        MockRequest.reset();
    });

    describe('upload', () => {
        async function runCompleteTest(createVersion, versionLabel, versionComment, replace) {
            const targetFolder = `/target/folder-create-version-${new Date().getTime()}`;
            MockRequest.addDirectUpload(targetFolder);
            const options = new DirectBinaryUploadOptions()
                .withUrl(MockRequest.getUrl(targetFolder))
                .withUploadFiles([{
                    fileName: 'myasset.jpg',
                    fileSize: 512,
                    blob: new MockBlob(),
                }])
                .withCreateVersion(createVersion)
                .withVersionLabel(versionLabel)
                .withVersionComment(versionComment)
                .withReplace(replace);

            const process = new DirectBinaryUploadProcess({}, options);

            await process.upload();

            // verify that complete request is correct
            const posts = MockRequest.history.post;
            should(posts.length).be.exactly(2);
            should(posts[0].url).be.exactly(MockRequest.getUrl(`${targetFolder}.initiateUpload.json`));
            should(posts[1].url).be.exactly(MockRequest.getUrl(`${targetFolder}.completeUpload.json`));

            const data = querystring.parse(posts[1].data);

            should(data.fileName).be.exactly('myasset.jpg');
            if (createVersion) {
                should(data.createVersion).be.ok();
                if (versionLabel) {
                    should(data.versionLabel).be.exactly(versionLabel);
                } else {
                    should(data.versionLabel).not.be.ok();
                }
                if (versionComment) {
                    should(data.versionComment).be.exactly(versionComment);
                } else {
                    should(versionComment).not.be.ok();
                }
            } else {
                should(data.createVersion).not.be.ok();
                should(data.versionLabel).not.be.ok();
                should(data.versionComment).not.be.ok();
            }
            if (replace && !createVersion) {
                should(data.replace).be.ok();
            } else {
                should(data.replace).not.be.ok();
            }
        }

        it('create version test', async () => {
            await runCompleteTest(true);
        });

        it('create version with label and comments', async () => {
            await runCompleteTest(true, 'label', 'comment');
        });

        it('replace test', async () => {
            await runCompleteTest(false, 'label', 'comment', true);
        });

        it('replace and create version test', async () => {
            await runCompleteTest(true, 'label', 'comment', true);
        });
    });
});